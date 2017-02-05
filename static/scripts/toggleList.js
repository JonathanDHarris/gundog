toggleList = function(i) {
    var elementDisplay = document.getElementById('list_' + i).style.display;
    
    if (elementDisplay === 'none') {
        var buttonText = document.getElementById('button_' + i).firstChild.data;
        document.getElementById('button_' + i).firstChild.data = buttonText.replace('Show', 'Hide');
        document.getElementById('list_' + i).style.display = 'block';
    } else {
        var buttonText = document.getElementById('button_' + i).firstChild.data;
        document.getElementById('button_' + i).firstChild.data =  buttonText.replace('Hide', 'Show');
        document.getElementById('list_' + i).style.display = 'none';
    };
}