togglePreAmble = function() {
    var elementDisplay = document.getElementById('gunDogPreAmble').style.display;
    
    if (elementDisplay === 'none') {
        var buttonText = document.getElementById('togglePreAmbleButton').firstChild.data;
        document.getElementById('togglePreAmbleButton').firstChild.data = buttonText.replace('Show', 'Hide');
        document.getElementById('gunDogPreAmble').style.display = 'block';
    } else {
        var buttonText = document.getElementById('togglePreAmbleButton').firstChild.data;
        document.getElementById('togglePreAmbleButton').firstChild.data =  buttonText.replace('Hide', 'Show');
        document.getElementById('gunDogPreAmble').style.display = 'none';
    };
}