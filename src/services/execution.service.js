const { exec } = require("child_process");
function runPlaywright(){
  return new Promise((res,rej)=>{
    exec("npx playwright test", (e, out)=>{
      if(e) return rej(e);
      res(out);
    });
  });
}
module.exports = { runPlaywright };
