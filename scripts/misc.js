//Alert
function createAlert(type, message){
    var alert = document.createElement("div");
    alert.className = "alertpop " + type;
    //message
    alert.innerText = message;
    //button
    var button = document.createElement("span");
    button.className = "closebtn"
    var textForButton = document.createTextNode("⮿");
    button.appendChild(textForButton);
    button.addEventListener("click", function(){
        var div = this.parentElement;
        div.style.opacity = "0";
        setTimeout(function(){ div.style.display = "none"; }, 600);
    });
    alert.appendChild(button);

    document.getElementsByClassName("alertPositioning")[0].appendChild(alert);
}