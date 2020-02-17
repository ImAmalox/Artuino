//Comms.
//
//This is one of the core files for the polargraph server program.  
//Comms can mean "communications" or "commands", either will do, since
//it contains methods for reading commands from the serial port.

boolean comms_waitForNextCommand(char *buf)
{
  int bufPos = 0;
  for (int i = 0; i<INLENGTH; i++) {
    buf[i] = 0;
  }  
  long lastRxTime = 0L;

  // loop while there's there isn't a terminated command.
  // (Note this might mean characters ARE arriving, but just
  //  that the command hasn't been finished yet.)
  boolean terminated = false;
  while (!terminated)
  {
    long timeSince = millis() - lastRxTime;
    
    // If the buffer is being filled, but hasn't received a new char in less than 100ms,
    // just cancel it. It's probably just junk.
    if (bufPos != 0 && timeSince > 100)
    {
#ifdef DEBUG_COMMS
      Serial.print(F("TIMEOUT"));
#endif
      // Clear the buffer and reset the position if it took too long
      for (int i = 0; i<INLENGTH; i++) {
        buf[i] = 0;
      }
      bufPos = 0;
    }
    
    // idle time is mostly spent in this loop.
    impl_runBackgroundProcesses();
    
    // And now read the command if one exists.
    if (Serial.available() > 0)
    {
      // Get the char
      char ch = Serial.read();
      
      // look at it, if it's a terminator, then lets terminate the string
      if (ch == INTERMINATOR || ch == SEMICOLON) {
        buf[bufPos] = 0; // null terminate the string
        terminated = true;
        
        for (int i = bufPos; i<INLENGTH-1; i++) {
          buf[i] = 0;
        }
        
      } else {
        // otherwise, just add it into the buffer
        buf[bufPos] = ch;
        bufPos++;
      }
      lastRxTime = millis();
    }
  }

  lastOperationTime = millis();
  lastInteractionTime = lastOperationTime;
#ifdef DEBUG_COMMS
      Serial.println(F("COMM_REC"));
#endif
  return true;
}

void comms_parseAndExecuteCommand(char *inS)
{
  boolean commandParsed = comms_parseCommand(inS);
  if (commandParsed)
  {
    impl_processCommand(lastCommand);
    for (int i = 0; i<INLENGTH; i++) { inS[i] = 0; }  
    commandConfirmed = false;
  }
  else
  {
    Serial.println(F("PARSE_FAIL"));
  }
  inNoOfParams = 0;
  
}

boolean comms_parseCommand(char *inS)
{
  // strstr returns a pointer to the location of ",END" in the incoming string (inS).
  char* sub = strstr(inS, CMD_END);
  sub[strlen(CMD_END)] = 0; // null terminate it directly after the ",END"
  if (strcmp(sub, CMD_END) == 0) 
  {
    comms_extractParams(inS);
    return true;
  }
  else
    return false;
}  

void comms_extractParams(char* inS) 
{
  char in[strlen(inS)];
  strcpy(in, inS);
  char * param;
  
  byte paramNumber = 0;
  param = strtok(in, COMMA);
  
  inParam1[0] = 0;
  inParam2[0] = 0;
  inParam3[0] = 0;
  inParam4[0] = 0;
  
  for (byte i=0; i<6; i++) {
      if (i == 0) {
        strcpy(inCmd, param);
      }
      else {
        param = strtok(NULL, COMMA);
        if (param != NULL) {
          if (strstr(CMD_END, param) == NULL) {
            // It's not null AND it wasn't 'END' either
            paramNumber++;
          }
        }
        
        switch(i)
        {
          case 1:
            if (param != NULL) strcpy(inParam1, param);
            break;
          case 2:
            if (param != NULL) strcpy(inParam2, param);
            break;
          case 3:
            if (param != NULL) strcpy(inParam3, param);
            break;
          case 4:
            if (param != NULL) strcpy(inParam4, param);
            break;
          default:
            break;
        }
      }
  }

  inNoOfParams = paramNumber;
}


void comms_ready()
{
  Serial.println(F(READY_STR));
}
void comms_drawing()
{
  Serial.println(F(DRAWING_STR));
}
void comms_requestResend()
{
  Serial.println(F(RESEND_STR));
}
void comms_unrecognisedCommand(String &com)
{
  Serial.println(F("UNK_COMM"));
}  
