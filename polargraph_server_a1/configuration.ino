//Configuration.
//
//This is one of the core files for the polargraph server program.  
//It sets up the motor objects (AccelSteppers), and has default
//values for the motor, sprocket and microstepping combinations used
//by polargraphs so far.

//BOEIT (MISSCHIEN) NIET

const int stepType = INTERLEAVE;
AF_Stepper afMotorA(motorStepsPerRev, 1);
AF_Stepper afMotorB(motorStepsPerRev, 2);

void forwarda() { afMotorA.onestep(FORWARD, stepType); }
void backwarda() { afMotorA.onestep(BACKWARD, stepType); }
void forwardb() { afMotorB.onestep(FORWARD, stepType); }
void backwardb() { afMotorB.onestep(BACKWARD, stepType); }

AccelStepper motorA(forwarda, backwarda);
AccelStepper motorB(forwardb, backwardb);

void configuration_motorSetup()
{
#ifdef SERIAL_STEPPER_DRIVERS
  pinMode(MOTOR_A_ENABLE_PIN, OUTPUT);
  digitalWrite(MOTOR_A_ENABLE_PIN, HIGH);
  pinMode(MOTOR_B_ENABLE_PIN, OUTPUT);
  digitalWrite(MOTOR_B_ENABLE_PIN, HIGH);
  motorA.setEnablePin(MOTOR_A_ENABLE_PIN);
  motorA.setPinsInverted(false, false, true);
  motorB.setEnablePin(MOTOR_B_ENABLE_PIN);
  motorB.setPinsInverted(true, false, true); // this one turns the opposite direction to A, hence inverted.
#endif
}

void configuration_setup()
{
  defaultMachineWidth = 650;
  defaultMachineHeight = 650;
  defaultMmPerRev = 95;
  defaultStepsPerRev = 400;
  defaultStepMultiplier = 1;
#ifdef ADAFRUIT_MOTORSHIELD_V2
  AFMS.begin();  // create with the default frequency 1.6KHz
#endif
  delay(500);
  
}
// end of Adafruit motorshield definition
// =================================================================
