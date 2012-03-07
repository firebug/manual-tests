

// JavaScript thermometer class
function Thermometer() {
    addMethod(this, "read", function(currentTemp, unit, freezing, boiling) {   
      // Read basic
      this._historicalTemp = this._currentTemp;
      this._currentTemp = currentTemp;
      this._freezing = freezing;
      this._boiling = boiling;
      this._celcius = (unit == Unit.Celcius ? currentTemp : fahrenheitToCelcius(currentTemp));
      this._fahrenheit = (unit == Unit.Fahrenheit ? currentTemp : celciusToFahrenheit(currentTemp));
      this._increment = 0;
      this._direction = Direction.Both;
      this._status = this.setStatus();
      
      this.validateStatus(); 
      this.getStatus(); 
    });

    addMethod(this, "read", function(currentTemp, unit, freezing, boiling, increment){   
      // Read with increment
      this._historicalTemp = this._currentTemp;
      this._currentTemp = currentTemp;
      this._freezing = freezing;
      this._boiling = boiling;
      this._celcius = (unit == Unit.Celcius ? currentTemp : fahrenheitToCelcius(currentTemp));
      this._fahrenheit = (unit == Unit.Fahrenheit ? currentTemp : celciusToFahrenheit(currentTemp));
      this._increment = increment;
      this._direction = Direction.Both;
      this._status = this.setStatus();
      
      this.validateStatus(); 
      this.getStatus();    
    });


    addMethod(this, "read", function(currentTemp, unit, freezing, boiling, increment, direction){   
      // Read with increment and direction
      this._historicalTemp = this._currentTemp;
      this._currentTemp = currentTemp;
      this._freezing = freezing;
      this._boiling = boiling;
      this._celcius = (unit == Unit.Celcius ? currentTemp : fahrenheitToCelcius(currentTemp));
      this._fahrenheit = (unit == Unit.Fahrenheit ? currentTemp : celciusToFahrenheit(currentTemp));
      this._increment = increment;
      this._direction = direction;
      this._status = this.setStatus(); 
      
      this.validateStatus();
      this.getStatus();
    });
}

Thermometer.prototype._currentTemp;
Thermometer.prototype._historicalTemp;
Thermometer.prototype._celcius;
Thermometer.prototype._fahrenheit;
Thermometer.prototype._freezing;
Thermometer.prototype._boiling;
Thermometer.prototype._increment;
Thermometer.prototype._direction;
Thermometer.prototype._status;
Thermometer.prototype._lastStatus;
Thermometer.prototype._statusChanged;
Thermometer.prototype._allowNotification;

// Set current status
Thermometer.prototype.setStatus = function() {
    if ( (this._currentTemp - this._boiling) == 0 ) {
       return Status.Boiling;
    } else if ( (this._currentTemp - this._freezing) == 0 ) {
       return Status.Freezing;
    } else {
       return Status.Between;
    }
}

// Validate status to determine if we can can show to user
Thermometer.prototype.validateStatus = function() {
    var minFreezing = parseFloat(this._freezing) - parseFloat(this._increment);
    var maxFreezing = parseFloat(this._freezing) + parseFloat(this._increment);
    var minBoiling = parseFloat(this._boiling) - parseFloat(this._increment);
    var maxBoiling = parseFloat(this._boiling) + parseFloat(this._increment);
    
    if (this._increment == 0) {  // Notify Always Case
       this._allowNotification = true;
    } else if ( ((this._currentTemp > maxFreezing || this._currentTemp < minFreezing) 
                && (this._lastStatus != Status.Boiling) && (this._status != Status.Freezing) ) ) { // Is outside allowed range
        this._lastStatus = Status.Between;        
        this._allowNotification = true; 
    } else if ( ((this._currentTemp > maxBoiling || this._currentTemp < minBoiling) && (this._lastStatus != Status.Freezing)  // Is outside allowed range
                && (this._status != Status.Freezing) ) ) {
        this._lastStatus = Status.Between;        
        this._allowNotification = true; 
    } else if ( (this._lastStatus != Status.Freezing) && (this._status == Status.Freezing) ) {
        this._lastStatus = Status.Freezing;
        this._allowNotification = true; 
    } else if ( (this._lastStatus != Status.Boiling) && (this._status == Status.Boiling) ) {
        this._lastStatus = Status.Boiling;
        this._allowNotification = true; 
    } else {
       this._allowNotification = false;
    } 
}

// Get current status
Thermometer.prototype.getStatus = function() {
    if (this._allowNotification == false) {
        this._statusChanged = false; 
    } else if ( ((this._status == Status.Freezing) || (this._status == Status.Boiling)) ) {
       if (this._direction == Direction.Both) {
            this._statusChanged = true;
        } else if ( (this._direction == Direction.Down) && (parseFloat(this._currentTemp) < parseFloat(this._historicalTemp)) ) {
            this._statusChanged = true;
        } else if ( (this._direction == Direction.Up) && (parseFloat(this._currentTemp) > parseFloat(this._historicalTemp)) ) {
            this._statusChanged = true;
        } else {
            this._statusChanged = false;
        }  
    } else {
       this._statusChanged = false;
    }     
}

function celciusToFahrenheit(value){
 return (212-32)/100*value+32;
}


function fahrenheitToCelcius(value){
 return 100/(212-32)*(value-32);

}

// addMethod - By John Resig (MIT Licensed)
function addMethod(object, name, fn){
    var old = object[ name ];
    object[ name ] = function(){
        if ( fn.length == arguments.length )
            return fn.apply( this, arguments );
        else if ( typeof old == 'function' )
            return old.apply( this, arguments );
    };
}

var Unit =
{
  Celcius: 0,
  Fahrenheit: 1
}

var Status =
{
  Between: 0,
  Freezing: 1,
  Boiling: 2   
}

var Direction =
{
  Up: 0,
  Down: 1,
  Both: 2
}