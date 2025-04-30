function GenerateRandomWords(){
    let s = "";
    let select = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for(let i = 1;i<=6;i++){
        s += select.charAt(Math.floor(Math.random()*select.length));
    }
    console.log(s);
    return s;
}


export default GenerateRandomWords;