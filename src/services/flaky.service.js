const history = {};
function detectFlaky(name, passed){
  if(!history[name]) history[name]=[];
  history[name].push(passed);
  const last = history[name].slice(-5);
  return last.includes(true) && last.includes(false);
}
module.exports = { detectFlaky };
