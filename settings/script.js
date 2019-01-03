function onHomeyReady( Homey ){
    // ...

    Homey.ready();

    var usernameElement = document.getElementById('username');
    var passwordElement = document.getElementById('password');
    var saveElement = document.getElementById('save');

    Homey.get('username', function( err, username ) {
        if( err ) return Homey.alert( err );
        usernameElement.value = username;
    });

    Homey.get('password', function( err, password ) {
        if( err ) return Homey.alert( err );
        passwordElement.value = password;
    });

    saveElement.addEventListener('click', function(e) {

        Homey.alert("Settings saved!");

        Homey.set('username', usernameElement.value, function( err ){
            if( err ) return Homey.alert( err );
        });
        Homey.set('password', passwordElement.value, function( err ){
            if( err ) return Homey.alert( err );
        });

    });
}