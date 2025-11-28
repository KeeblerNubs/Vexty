module.exports = {
  packagerConfig: {
    icon: "./resources/FLAKE_Anubis_FullSuite"
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "vexty_flake_suite",
        setupExe: "vEXTY_FLAKE_Suite_Setup.exe",
        iconUrl: "./resources/FLAKE_Anubis_FullSuite.ico",
        setupIcon: "./resources/FLAKE_Anubis_FullSuite.ico"
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "linux", "win32"]
    }
  ]
};
