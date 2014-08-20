function collectData() {
  var spreadsheet = SpreadsheetApp.openById("1po4fFIrSeggmJWQ8nIMaIZROCJc3iSZ8To_OugPAAvk");
  var sheet = spreadsheet.getSheetByName("Raw Data");
  spreadsheet.setActiveSheet(sheet);
  Logger.log("Data will be added to spreadsheet %s on sheet %s", spreadsheet.getName(), sheet.getSheetName());

  var url_response = "";
  var fetch_attempts_remaining = 3;
  for (; url_response == ""; --fetch_attempts_remaining) {
    try {
      url_response = UrlFetchApp.fetch("https://api.spark.io/v1/devices/nanobead/sensor_state?access_token=3bdc1e530bd5834d7adf09646819a1808619ec39");
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

  try {
    var response = JSON.parse(url_response.getContentText()); // parse the JSON the Core API created
    Logger.log("Got raw JSON: %s", response);
    
    var sensor_state_json = unescape(response.result); // grab the actual sensor contents
    //var coreinfo_json = unescape(response.core_state);
    Logger.log("Got sensor state: %s", sensor_state_json);

    try {
      var parsed_sensors = JSON.parse(sensor_state_json); // parse the JSON you created
      //var parsed_coreinfo = JSON.parse(coreinfo_json);
      if (!response.coreInfo.connected) {
        Logger.log("Core was not connected. Not logging results.");
      } else {
        var date = new Date(); // time stamps are always good when taking readings
        sheet.appendRow([date, parsed_sensors.light_sensor_1, parsed_sensors.temperature_sensor_1, parsed_sensors.temperature_sensor_2, parsed_sensors.temperature_sensor_3, parsed_sensors.photo_count_1, parsed_sensors.photo_count_2]);
        Logger.log("Logged data successfully.");
      }
    } catch(e) {
      Logger.log("Unable parse JSON: %s", e.message);
    }
  } catch(e) {
    Logger.log("Unable to get JSON: %s", e.message);
  }
}
