flowchart TD
    Start[Start] --> CLIInstall[Install CLI Tool]
    CLIInstall --> ConfigEdit[Edit Configuration File]
    ConfigEdit --> CLIStart[Run Start Command]
    CLIStart --> ConfigParse[Parse Config]
    ConfigParse --> ConfigValid{Config Valid}
    ConfigValid -- No --> ConfigError[Show Config Error]
    ConfigError --> End[End]
    ConfigValid -- Yes --> LoadModules[Load Modules]
    LoadModules --> ModulesValid{Modules Loaded}
    ModulesValid -- No --> ModuleWarn[Show Module Warning]
    ModulesValid -- Yes --> SystemRun[System Running]
    ModuleWarn --> DegradedMode[System in Degraded Mode]
    DegradedMode --> SystemRun
    SystemRun --> UserCmd{User Issues Commands}
    UserCmd --> ManagerRoute[Route Command to Manager]
    ManagerRoute --> ModuleRoute[Route to HAL Module]
    ModuleRoute --> HardwareAction[Perform Hardware Interaction]
    HardwareAction --> Response[Module Returns Response]
    Response --> CLIOutput[Display Output]
    CLIOutput --> SystemRun
    SystemRun --> ExitCheck{Exit CLI}
    ExitCheck -- Yes --> StopSys[Stop System]
    StopSys --> End
    ExitCheck -- No --> SystemRun