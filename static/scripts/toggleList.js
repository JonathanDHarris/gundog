toggleList = function(i) {
    var elementDisplay = document.getElementById('list_' + i).style.display;
    
    if (elementDisplay === 'none') {
        var buttonText = document.getElementById('button_' + i).innerHTML;
        document.getElementById('button_' + i).innerHTML = buttonText.replace('more', 'less');
        document.getElementById('list_' + i).style.display = 'block';
    } else {
        var buttonText = document.getElementById('button_' + i).innerHTML;
        document.getElementById('button_' + i).innerHTML =  buttonText.replace('less', 'more');
        document.getElementById('list_' + i).style.display = 'none';
    };
}