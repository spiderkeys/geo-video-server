var events = require('events');  
var zmq		= require('zmq');

var Camera = function( cameraOffset )
{
    var self            = this;
    this.cameraNumber   = cameraOffset;
    this.channels       = {};
    
    // Helper function
    var GetCamChannelString = function( channelNum )
    {
        return ( "[" + self.cameraNumber + "][" + channelNum + "]: " );
    };
    
    /////////////
    // Set up channel status subscribers
    this.commandPublisher    = zmq.socket( 'pub' );
    
    var channelRegSub       = zmq.socket( 'sub' );
    var channelSettingsSub  = zmq.socket( 'sub' );
    var channelHealthSub    = zmq.socket( 'sub' );
    
    this.commandPublisher.connect( "ipc:///tmp/geomux_command" + self.cameraNumber + ".ipc" );
    
    channelRegSub.connect( "ipc:///tmp/geomux_status" + self.cameraNumber + ".ipc" );
    channelSettingsSub.connect( "ipc:///tmp/geomux_status" + self.cameraNumber + ".ipc" );
    channelHealthSub.connect( "ipc:///tmp/geomux_status" + self.cameraNumber + ".ipc" );
    
    channelRegSub.subscribe("channel_registration");
    channelSettingsSub.subscribe("channel_settings");
    channelHealthSub.subscribe("channel_health");
    /////////////
   
    // Channel registrations
    channelRegSub.on( 'message', function( topic, msg )
    {
        var registration = JSON.parse( msg );

        if( registration.status == true )
        {
            console.log( "Channel announced " + GetCamChannelString( registration.chNum ) + registration.endpoint );
            
            // Create a channel object
            self.channels[ registration.chNum ] = require( "channel.js" )( self, registration.chNum, registration.endpoint );
        }
        else
        {
            console.log( "Channel closed " + GetCamChannelString( registration.chNum ) );
            
            // Remove the channel object
            self.channels[ registration.chNum ] = undefined;
        }
    } );
    
    // Channel settings
    channelSettingsSub.on( 'message', function( topic, msg )
    {
        var settings = JSON.parse( msg );
        
        if( self.channels[ settings.chNum ] === undefined )
        {
            console.log( "Settings received for non-existent channel" );
        }
        else
        {
            console.log( "Got channel settings " + GetCamChannelString( settings.chNum ) );
            self.channels[ settings.chNum ].settings = settings.settings;
        }
    } );
    
    // Channel health
    channelHealthSub.on( 'message', function( topic, msg )
    {
        var health = JSON.parse( msg );

        console.log( "Channel health announced " + GetCamChannelString( health.chNum ) + JSON.stringify( health ) );
    } );
    
    events.EventEmitter.call(this);
};

Camera.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = function( cameraOffset ) {
  return new Camera( cameraOffset );
};