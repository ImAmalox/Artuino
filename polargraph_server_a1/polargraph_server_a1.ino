////This is a unified codebase for a few different versions of Polargraph Server.
//
////You can control how it is compiled by changing the #define lines below.
//
//There are four config sections:
//1. Specify what kind of controller board you are using
//2. Specify what kind of motor driver you are using:
//  i. Adafruit Motorshield v1
//  ii. Adafruit Motorshield v2
//3. Turn on some debugging code
//4. Disable program features if you need to free up space

// 1. Specify what kind of controller board you are using
#ifndef MICROCONTROLLER
#define MICROCONTROLLER MC_UNO
//#define MICROCONTROLLER MC_MEGA
#endif

// 2. Specify what kind of motor driver you are using
// ==================================================
// Only ONE set of lines below should be uncommented.

//   i. Adafruit Motorshield v1. The original, and still the best.
//   -------------------------------------------------------------
#define ADAFRUIT_MOTORSHIELD_V1
#include <AFMotor.h>

//   ii. Adafruit Motorshield v2. It's all squealy.
//   ----------------------------------------------
//#define ADAFRUIT_MOTORSHIELD_V2
//#include <Wire.h>
//#include <Adafruit_MotorShield.h>
//#include "utility/Adafruit_PWMServoDriver.h"

// 3.  Turn on some debugging code if you want horror
// =================================================
#define DEBUG
#define DEBUG_COMMS
//#define DEBUG_PENLIFT
//#define DEBUG_PIXEL

// 4.  Disable program features if you need to free up space
// ========================================================
#define PIXEL_DRAWING
#define PENLIFT
#define VECTOR_LINES

/*  ===========================================================  
    These variables are common to all polargraph server builds
=========================================================== */   
 
// ==========================================================
// Some microcontroller's names
#define MC_UNO 1

#include <AccelStepper.h>
#include <Servo.h>
#include <EEPROM.h>
#include "EEPROMAnything.h"

const String FIRMWARE_VERSION_NO = "1.2";

//  EEPROM addresses
const byte EEPROM_MACHINE_WIDTH = 0;
const byte EEPROM_MACHINE_HEIGHT = 2;
const byte EEPROM_MACHINE_MM_PER_REV = 14; // 4 bytes (float)
const byte EEPROM_MACHINE_STEPS_PER_REV = 18;
const byte EEPROM_MACHINE_STEP_MULTIPLIER = 20;

const byte EEPROM_MACHINE_MOTOR_SPEED = 22; // 4 bytes float
const byte EEPROM_MACHINE_MOTOR_ACCEL = 26; // 4 bytes float
const byte EEPROM_MACHINE_PEN_WIDTH = 30; // 4 bytes float

const byte EEPROM_MACHINE_HOME_A = 34; // 4 bytes
const byte EEPROM_MACHINE_HOME_B = 38; // 4 bytes

const byte EEPROM_PENLIFT_DOWN = 42; // 2 bytes
const byte EEPROM_PENLIFT_UP = 44; // 2 bytes

// Pen raising servo
Servo penHeight;
const int DEFAULT_DOWN_POSITION = 90;
const int DEFAULT_UP_POSITION = 180;
static int upPosition = DEFAULT_UP_POSITION; // defaults
static int downPosition = DEFAULT_DOWN_POSITION;
static int penLiftSpeed = 3; // ms between steps of moving motor
byte const PEN_HEIGHT_SERVO_PIN = 9; //UNL2003 driver uses pin 9
boolean isPenUp = false;

int motorStepsPerRev = 800;
float mmPerRev = 95;
byte stepMultiplier = 1;

static int machineWidth = 650;
static int machineHeight = 800;

static int defaultMachineWidth = 650;
static int defaultMachineHeight = 650;
static int defaultMmPerRev = 95;
static int defaultStepsPerRev = 800;
static int defaultStepMultiplier = 1;

float currentMaxSpeed = 800.0;
float currentAcceleration = 400.0;
boolean usingAcceleration = true;

int startLengthMM = 800;

float mmPerStep = mmPerRev / motorStepsPerRev;
float stepsPerMM = motorStepsPerRev / mmPerRev;

long pageWidth = machineWidth * stepsPerMM;
long pageHeight = machineHeight * stepsPerMM;
long maxLength = 0;

//static char rowAxis = 'A';
const int INLENGTH = 50;
const char INTERMINATOR = 10;
const char SEMICOLON = ';';

float penWidth = 0.8F; // line width in mm

boolean reportingPosition = true;
boolean acceleration = true;

extern AccelStepper motorA;
extern AccelStepper motorB;

boolean currentlyRunning = true;

static char inCmd[10];
static char inParam1[14];
static char inParam2[14];
static char inParam3[14];
static char inParam4[14];
//static char inParams[4][14];

byte inNoOfParams;

char lastCommand[INLENGTH+1];
boolean commandConfirmed = false;

int rebroadcastReadyInterval = 5000;
long lastOperationTime = 0L;
long motorIdleTimeBeforePowerDown = 600000L;
boolean automaticPowerDown = true;
boolean powerIsOn = false;

long lastInteractionTime = 0L;

#ifdef PIXEL_DRAWING
static boolean lastWaveWasTop = true;

//  Drawing direction
const static byte DIR_NE = 1;
const static byte DIR_SE = 2;
const static byte DIR_SW = 3;
const static byte DIR_NW = 4;

static int globalDrawDirection = DIR_NW;

const static byte DIR_MODE_AUTO = 1;
const static byte DIR_MODE_PRESET = 2;
static byte globalDrawDirectionMode = DIR_MODE_AUTO;
#endif

#define READY_STR "READY"
#define RESEND_STR "RESEND"
#define DRAWING_STR "DRAWING"
#define OUT_CMD_SYNC_STR "SYNC,"

char MSG_E_STR[] = "MSG,E,";
char MSG_I_STR[] = "MSG,I,";
char MSG_D_STR[] = "MSG,D,";

const static char COMMA[] = ",";
const static char CMD_END[] = ",END";
const static String CMD_CHANGELENGTH = "C01";
const static String CMD_CHANGEPENWIDTH = "C02";
//const static String CMD_CHANGEMOTORSPEED = "C03";
//const static String CMD_CHANGEMOTORACCEL = "C04";
#ifdef PIXEL_DRAWING
const static String CMD_DRAWPIXEL = "C05";
const static String CMD_DRAWSCRIBBLEPIXEL = "C06";
//const static String CMD_DRAWRECT = "C07";
const static String CMD_CHANGEDRAWINGDIRECTION = "C08";
//const static String CMD_TESTPATTERN = "C10";
const static String CMD_TESTPENWIDTHSQUARE = "C11";
#endif
const static String CMD_SETPOSITION = "C09";
#ifdef PENLIFT
const static String CMD_PENDOWN = "C13";
const static String CMD_PENUP = "C14";
const static String CMD_SETPENLIFTRANGE = "C45";
#endif
#ifdef VECTOR_LINES
const static String CMD_CHANGELENGTHDIRECT = "C17";
#endif
const static String CMD_SETMACHINESIZE = "C24";
//const static String CMD_SETMACHINENAME = "C25";
const static String CMD_GETMACHINEDETAILS = "C26";
const static String CMD_RESETEEPROM = "C27";
const static String CMD_SETMACHINEMMPERREV = "C29";
const static String CMD_SETMACHINESTEPSPERREV = "C30";
const static String CMD_SETMOTORSPEED = "C31";
const static String CMD_SETMOTORACCEL = "C32";
const static String CMD_SETMACHINESTEPMULTIPLIER = "C37";
const static String CMD_SETHOMEPOINT = "C69";

void setup() 
{
  Serial.begin(57600);           // set up Serial library at 57600 bps
  Serial.println("STARTUP");
  comms_ready();
  configuration_motorSetup();
  eeprom_loadMachineSpecFromEeprom();
  configuration_setup();
  motorA.setMaxSpeed(currentMaxSpeed);
  motorA.setAcceleration(currentAcceleration);  
  motorB.setMaxSpeed(currentMaxSpeed);
  motorB.setAcceleration(currentAcceleration);
  
  float startLength = ((float) startLengthMM / (float) mmPerRev) * (float) motorStepsPerRev;
  
  motorA.setCurrentPosition(startLength);
  motorB.setCurrentPosition(startLength);
  for (int i = 0; i<INLENGTH; i++) {
    lastCommand[i] = 0;
  }    

#ifdef PENLIFT
  penlift_penUp();
#endif
  delay(500);

}

void loop()
{
  if (comms_waitForNextCommand(lastCommand)) 
  {
    comms_parseAndExecuteCommand(lastCommand);
  }
}
