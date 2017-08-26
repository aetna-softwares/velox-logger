const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const stackTrace = require('stack-trace');

if(!global.VeloxLoggers){
    //register as global variable because the module can be nested at different levels in other module
    //but we want it to share the same configuration
    global.VeloxLoggers = {} ;
}

/**
 * @typedef VeloxLogConfiguration
 * @type {object}
 * @property {"debug"|"info"|"warn"|"error"} level log level
 * @property {string} [logDir] the directory in which put the log
 * @property {string} [filename] the log filename. log to console if not given
 */

/**
 * Load a logging configuration
 * 
 * You can load many configuration to separate logs in your application
 * 
 * @example
 * VeloxLogger.loadConfiguration({level: "info", logDir: "/var/log/myApp", filename: "main.log"}); //create a general logger with level info
 * VeloxLogger.loadConfiguration("service", {level: "debug", logDir: "/var/log/myApp", filename: "service.log" }); //create a logger "service" with level debug
 *
 * @param {string} name the logger name
 * @param {VeloxLogConfiguration} configuration the logger configuration
 */
module.exports.loadConfiguration = function(name, configuration){
    var label = name ;
    if(typeof(name) !== "string"){
        configuration = name;
        name = "___main" ;
        label = "MAIN" ;
    }
    
    var logTransport = new (winston.transports.Console)({timestamp : true, label : label}) ;
    if(configuration.filename){
        if(!configuration.logDir){ throw "You must give a logDir if you give a filename to logger configuration" ;}
        logTransport = new(winston.transports.DailyRotateFile)({
            json : false,
            prettyPrint : true,
            timestamp : true,
            filename: configuration.filename,
            dirname: configuration.logDir,
            datePattern: '.yyyy-MM-dd',
            maxFiles : 120,
            maxsize: 5000000
        }) ;
    }
    global.VeloxLoggers[name] = new (winston.Logger)({level: configuration.level, transports: [ logTransport ] });
} ;

/**
 * Get the logger from it name
 * 
 * If the logger does not exists, it fallback to main logger.
 * If main logger does not exist, a logger debug to console is created
 * 
 * @param {string} loggerName the logger name
 */
module.exports.logger = function(loggerName){
    if(!loggerName){
        let trace = stackTrace.get();
        var callerFileName = "Anonymous" ;
        for(let t of trace){
            let fileName = t.getFileName() ;
            if(fileName && fileName.indexOf("velox-logger") === -1){
                callerFileName = fileName;
                break;
            }
        }
        console.log("stack "+callerFileName);
        loggerName = path.basename(callerFileName) ;
        console.log("stack logger "+loggerName);
    }

	if(!global.VeloxLoggers.___main){
        global.VeloxLoggers.___main =  new (winston.Logger)({ transports: [new (winston.transports.Console)({ level: "debug", timestamp : true, label : "DEFAULT"})]}) ;
        global.VeloxLoggers.___main.warn("No logging configuration loaded, use default debug logging") ;
    }

    var log = global.VeloxLoggers [loggerName] ;
    if(!log){
        return global.VeloxLoggers.___main ;
    }
	return log ;
} ;

