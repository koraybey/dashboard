![Screenshot 2024-03-27 at 00-38-53 Dashboard](https://github.com/koraybey/mqtt-dashboard/assets/21336342/361a5092-243d-47b9-bd1a-07f754028507)

## Why

Dumping MQTT logs to a Telegram bot does not allow me to derive valuable insights. I want to have more information about my device usage patterns, monitor overall health metrics and control some of my devices remotely.

My previous setup had too many layers of complexity and provided separate services for various use cases. I needed a simpler, centralized solution. Moreover, Apple being Apple™, Apple Home does not work without a Apple HomePod. I am locked out of my devices outside my house, even if my phone is connected to an overlay network. That means I cannot interact with any of my devices without paying for a HomePod.

## Ingredients

- **Server**: [Zigbee2MQTT](https://www.zigbee2mqtt.io/) is unparalleled when it comes to eliminating the need for proprietary Zigbee bridges. Grab a [Raspberry Pi](https://www.raspberrypi.com/) or [HP t530 Thin Client](https://www.ebay.de/itm/144913355269?epid=17016765429) for €30, and install a [MQTT broker](https://www.mosquitto.org/download/)
- **Zigbee adapter**: An adapter compatible Zigbee2MQTT is required. I use [SONOFF Zigbee 3.0 USB Dongle Plus](https://www.amazon.de/-/en/gp/product/B09KXTCMSC?) at home and I find it very reliable
- **Camera with RTSP**: Ideally grab a camera without internet connection. Stay away from unknown and unreliable brands for security reasons. I configured an unused [E1 Pro](https://www.amazon.de/Reolink-%C3%9Cberwachungskamera-Kameramonitor-IR-Nachtsicht-SD-Kartenslot-4mp-Wlan-Kamera-Schwarz/dp/B08S6TKP26) camera I have lying around
- **RTSP to HLS converter**: Video stream must be consumable in browser. Hence, conversion to m3u8 is needed. Previously I hosted ffmpeg instances but currently I use a native converter called [RTSPtoWeb](https://github.com/deepch/RTSPtoWeb)
- **Sensors**: Any compatible with Zigbee2MQTT. Here is a list of supported and affordable [contact](https://www.zigbee2mqtt.io/supported-devices/#v=SONOFF,Aqara&e=contact) and [occupancy](https://www.zigbee2mqtt.io/supported-devices/#e=occupancy&v=SONOFF,Aqara) sensors I previously used
- **Lights** _(or plugs connected to lights)_: For this project, I will use a plug to control the light located in my studio, as I don't want to screw and unscrew my lights. Here is a list of supported and affordable [plugs](https://www.zigbee2mqtt.io/supported-devices/#v=Nous&s=smart%20plug) and [lights](https://www.zigbee2mqtt.io/supported-devices/#s=smart%20light&v=Nous) I previously used

**You need to bring your ingredients and deployment strategies of your choice. This project only contains the React front-end that allows you to monitor health, control devices and watch the stream, and a back-end to process and serve the data end-points.**

> [!CAUTION]  
> It is not advised to expose this dashboard to internet. Use peer-to-peer overlay networks such as [Nebula](https://github.com/slackhq/nebula) to access the local computer where the dashboard is running.

## Preparation

You will need

- [rustup](https://rustup.rs/)
- [node](https://nodejs.org/en/)
- [pnpm](https://pnpm.io/)

You may choose to use [asdf](https://asdf-vm.com/) and use pinned node and pnpm versions for straight-forward application runtime management. However, installing rust via rustup is recommended.

```shell
asdf plugin add nodejs
asdf plugin-add pnpm
asdf install
```

### Installing dependencies and building the project

#### Logging MQTT messages

Check root and workspace `package.json` files to see available scripts.
Make sure [mqtt-sqlite](https://github.com/koraybey/mqtt-sqlite) is running with a complete device configuration. Database package reads the configuration file and database created by that repository.

#### Running the GraphQL server

Once `mqtt-sqlite` is running and logging MQTT messages, clone this repository where `mqtt-sqlite` resides. Head over to the `server` package and build a docker image, then run the image by mounting the `shared` directory where `configuration.json` and `database.sqlite` are located. These files will be created when `mqtt-sqlite` is setup and shared with the `server` package.

```shell
docker build -t mqtt-sqlite-server .
docker run -dti -v /home/koraybey/mqtt-sqlite/shared:/data/shared -p 4000:4000  -e DATABASE_URL=shared/database.sqlite -e CONFIG_URL=shared/configuration.json mqtt-sqlite-server
```

#### Setting up the video stream

Obtain the `.m3u8` URL for your stream and change the existing url in `@/components/Video`.
