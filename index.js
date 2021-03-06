'use strict';

var debug = require('debug')('while-connected');



function whileConnected(socket, debounce, f){
  function is_socket_connected(){
    return is_connected(socket);
  }
  return asyncWhile(is_socket_connected, debounce, f);
}


/* Predicate based on facts demonstrated by:
https://gist.github.com/jasonkuhrt/9548208 */
function is_connected(socket){
  return socket._handle || socket.writable || socket.readable;
}


function asyncWhile(predicate, debounce_ms, f){
  /* If the predicate is DOA (dead on arrival) then
  abort immediately. */
  if (!predicate()) return;

  /* We need two pieces of state. One, to
  track the countdown timer, and two, to
  track users' re-run requests. */
  var run_requseted = false;
  var countdown = null;

  /* Loop ignition. Note, from here on
  out the user will be in charge of queuing
  any further iteration */
  run();


  function run(){
    debug('run');

    /* Begin a countdown that delays
    request_run until its completion. Importantly
    this MUST be setup before we run f specially for
    the case that f chooses to syncronously execute
    request_run. Without countdown we would have an
    immediate infinite loop. */
    countdown = setTimeout(on_countdowned, debounce_ms);

    /* Execute f, passing it a trigger to re-run itself
    should it wish to. From f's POV this function may be
    identified as 'again'. */
    f(request_run);
  }


  function run_again(){
    debug('run_again');
    run_requseted = false;
    run();
  }


  function request_run(){
    debug('request_run: still connected? %j', predicate());

    /* Its entirely possible the predicate changed
    since last run. Our oauth is to abort in this case, ignoring
    the user's request. */
    if (!predicate()) return;

    debug('request_run: countdowned? %j', !Boolean(countdown));

    /* Flag the user's re-run request. Its possible that
    countdown has already cleared in which case
    we may re-run immediately. */
    run_requseted = true;
    if (!countdown) run_again();
  }


  function on_countdowned(){
    debug('on_countdowned: run_requseted? %j', run_requseted);

    /* Its entirely possible the predicate changed
    during the interval. Our oauth is to abort if so,
    even if a run was requested. */
    if (!predicate()) return;

    countdown = null;
    if (run_requseted) run_again();
  }
}



module.exports = whileConnected;