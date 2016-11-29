toggleList = function(i) {
    var elementDisplay = document.getElementById('list_' + i).style.display;
    
    if (elementDisplay === 'none') {
        document.getElementById('button_' + i).firstChild.data = 'Hide List';
        document.getElementById('list_' + i).style.display = 'block';
    } else {
        document.getElementById('button_' + i).firstChild.data = 'Show List';
        document.getElementById('list_' + i).style.display = 'none';
    };
}