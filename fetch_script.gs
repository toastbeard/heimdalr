// Find your access token in your spark.io project by clicking the gear icon ("Settings") in the lower left.
var ACCESS_TOKEN = "your access token here"

// You can find this in the URL of the spreadsheet: https://docs.google.com/spreadsheets/d/<this part>/edit
var SPREADSHEET_ID = "1po4fFIrSeggmJWQ8nIMaIZROCJc3iSZ8To_OugPAAvk"

// This is the name of the "sheet" to write to (look for the tab name in the bottom left).
var SPREADSHEET_SHEET_NAME = "Raw Data"

// Main function, invoked on a timer.
function collectData() {
  // Get the raw JSON message from Spark.
  var raw_url_response = get_raw_url_response();
  
  // Pull out and parse the JSON for the sensor data.
  var parsed_sensors = parse_raw_url_response(raw_url_response);
  
  // Log a new row in the spreadsheet.
  log_data(parsed_sensors);
}

// Pull a JSON message from the Spark cloud.
function get_raw_url_response() {
  var url_response = "";
  var fetch_attempts_remaining = 3;
  for (; url_response == ""; --fetch_attempts_remaining) {
    try {
      url_response = UrlFetchApp.fetch("https://api.spark.io/v1/devices/nanobead/sensor_state?access_token=" + ACCESS_TOKEN);
    } catch(e) {
      if (fetch_attempts_remaining < 1) {
        Logger.log("Ran out of retries when fetching URL.");
        throw e;
      } else {
        Logger.log("Unable to fetch data (will retry): %s", e.message);
      }
    }
  }
  Logger.log("Got raw url response: %s", url_response); 
  return url_response;
}

// Take the raw URL response, locate the JSON for the sensors, and parse it.
function parse_raw_url_response(url_response) {
  var sensor_state_json = ""
  try {
    // Parse the JSON of the Spark message.
    var response_json = JSON.parse(url_response.getContentText());
    sensor_state_json = unescape(response_json.result);
  } catch(e) {
    Logger.log("Unable to parse Spark JSON: %s", e.message);
    throw e;
  }
  Logger.log("Got sensor JSON: %s", sensor_state_json);

  try {
    // Parse the JSON of my response message.
    var parsed_sensors = JSON.parse(sensor_state_json);
  } catch(e) {
    Logger.log("Unable parse sensor JSON: %s", e.message);
    throw e;
  }
  return parsed_sensors;
}

// Takes in the parsed JSON structure and writes a new record to the spreadsheet.
function log_data(parsed_sensors) {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SPREADSHEET_SHEET_NAME);
  spreadsheet.setActiveSheet(sheet);
  
  Logger.log("Data will be added to spreadsheet %s on sheet %s", spreadsheet.getName(), sheet.getSheetName());
  
  var date = new Date();  // generate a timestamp
  sheet.appendRow([date, parsed_sensors.light_sensor_1, parsed_sensors.temperature_sensor_1, parsed_sensors.temperature_sensor_2,
                   parsed_sensors.temperature_sensor_3, parsed_sensors.photo_count_1, parsed_sensors.photo_count_2]);
  Logger.log("Logged data successfully.");
}
