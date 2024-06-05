# Wiki Drop Logger

Drop logger for the wiki.

## How to Install & Required Settings

To install Wiki Drop Logger copy & paste this link into Alt1's browser app:
`alt1://addapp/https://nadyanayme.github.io/wiki-drop-logger/dist/appconfig.json`

If you do not have Alt1 Toolkit installed already you can [download it from runeapps.org](https://runeapps.org/alt1). In order for Wiki Drop Logger to work make sure your Runescape settings for Game and UI Scale settings are set to `100%` as this is required for Alt1 to be able to read your game screen.

## Help Test!

Install with the link above and be sure your interfaces are setup properly (see Troubleshooting steps below).

Open your Runemetric's drops interface and ensure you have it set to "Drop" mode in the options and not "Loot".

Right click -> Inspect Element in the app window once you see your Map / Drops in the app. After a few more seconds the app should OCR your drops list and spit out the results into the console.

Compare the numbers in the console to your actual drops for any errors. If you find any let me know.

## Troubleshooting

- Make sure Alt1 can read your screen - if you have a 1440p, 3k, or 4k monitor you may need to override your DPI scaling for the rs2client.exe in order for Alt1 to read your screen
- Only the NIS interface is supported not Legacy
- Interface must be 100% opaque / non-transparent or drop logger will not find your map or drops interface
- Interface scaling must be at 100%

## My Other Plugins

To see my other Alt1 plugins [click here](https://github.com/NadyaNayme/NyusPluginDirectory)
