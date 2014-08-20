// This #include statement was automatically added by the Spark IDE.
#include "I2Cdev/I2Cdev.h"

// Analog sensor values
static const short kAnalogReadRepeatCount = 16;
static int light_sensor_a2d_1 = 0;
static int temperature_sensor_a2d_1 = 0;
static int temperature_sensor_a2d_2 = 0;

static int16_t temperature_sensor_i2c_1 = 0;
static int time_of_last_i2c_read = 0;
static const short kLM92Address = 0x4B;

// Used to export data.
static char sensor_export_str[200] = {0};

// Store the values of each photo pin.
static const int kNumPhotoPins = 2;
volatile int photo_pins[kNumPhotoPins] = {0};

// Photointerrupt ISRs
void photo_interrupt_0(void) { photo_pins[0]++; }
void photo_interrupt_1(void) { photo_pins[1]++; }

void setup()
{
    pinMode(D0, INPUT);  // i2c data (SDA)
    pinMode(D1, OUTPUT);  // i2c clock (SCL)
    pinMode(A7, INPUT);  // light
    pinMode(A6, INPUT);  // old temperature sensor
    pinMode(A5, INPUT);  // new temperature sensor
    
    // onboard LED
    pinMode(D7, OUTPUT); 
    digitalWrite(D7, LOW);
    
    // Set up photointerrupts
    pinMode(A0, INPUT); attachInterrupt(A0, photo_interrupt_0, RISING);
    pinMode(A1, INPUT); attachInterrupt(A1, photo_interrupt_1, RISING);
    
    // Set up I2C
    Wire.begin();
    
    // expose your char buffer to the Cloud API
    Spark.variable("sensor_state", &sensor_export_str, STRING);
}

void update_i2c_temperature(void) {
    uint16_t tmp;
    if (I2Cdev::readWord(kLM92Address, 0, &tmp) != true) {
        temperature_sensor_i2c_1 = -1;
    } else {
        temperature_sensor_i2c_1 = tmp >> 3;
        if (temperature_sensor_i2c_1 & 0x1000) {
            temperature_sensor_i2c_1 |= 0xE000;  // Sign extend the negative value
        }
    }
}

static short next_analog_sensor_to_update = 0;
const short kTotalAnalogSensors = 4;

#define ANALOG_SENSOR_UPDATE(pin, variable) variable = 0; for (int i = 0; i < kAnalogReadRepeatCount; ++i) { variable += analogRead(pin); } variable /= kAnalogReadRepeatCount;

void update_one_analog_sensor_round_robin(void) {
    switch (next_analog_sensor_to_update) {
        case 0:
            ANALOG_SENSOR_UPDATE(A7, light_sensor_a2d_1);
            break;
        case 1:
            ANALOG_SENSOR_UPDATE(A6, temperature_sensor_a2d_1);
            break;
        case 2:
            ANALOG_SENSOR_UPDATE(A5, temperature_sensor_a2d_2);
            break;
        case 3:
            // This sensor doesn't like being polled more than once per second.
            if (Time.now() - time_of_last_i2c_read > 1) {
                update_i2c_temperature();
                time_of_last_i2c_read = Time.now();
            }
        default:
            next_analog_sensor_to_update = 0;
            return;
    }
    next_analog_sensor_to_update++;
}

void loop()
{
    update_one_analog_sensor_round_robin();
    
    digitalWrite(D7, digitalRead(A1));

    // format your data as JSON, don't forget to escape the double quotes
    sprintf(sensor_export_str, "{\"light_sensor_1\":%d,\"temperature_sensor_1\":%d,\"temperature_sensor_2\":%d,\"temperature_sensor_3\":%d,\"photo_count_1\":%d,\"photo_count_2\":%d}",
                                   light_sensor_a2d_1,   temperature_sensor_a2d_1,   temperature_sensor_a2d_2,   temperature_sensor_i2c_1,   photo_pins[0],       photo_pins[1]);
}
