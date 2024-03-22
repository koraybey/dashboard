import type { Message, MQTTError } from 'paho-mqtt'
import Paho from 'paho-mqtt'
import * as RA from 'ramda-adjunct'
import { useEffect } from 'react'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'

import type { ParsedMessage } from '@/types/exposes'

const client = new Paho.Client(
    '10.147.17.93',
    Number(1881),
    `mqttjs_${Math.random().toString(16).slice(2, 10)}`
)

client.onConnectionLost = onConnectionLost
client.onMessageArrived = onHandleMessage

type MqttStore = {
    isConnected: boolean
    deviceStatus: { [key: string]: string }[]
    updateDeviceStatus: (topic: string, status: boolean | undefined) => void
}

export const useMqttStore = create<MqttStore>()(
    devtools(
        persist(
            (set) => ({
                logs: [],
                isConnected: false,
                deviceStatus: [],
                updateDeviceStatus: (topic, status) =>
                    set((state) => ({
                        deviceStatus: {
                            ...state.deviceStatus,
                            [topic]: { status },
                        },
                    })),
            }),
            {
                name: 'mqtt-storage',
                storage: createJSONStorage(() => sessionStorage),
                partialize: (state) =>
                    Object.fromEntries(
                        Object.entries(state).filter(
                            ([key]) =>
                                !['isConnected', 'deviceStatus'].includes(key)
                        )
                    ),
            }
        )
    )
)

client.connect({
    onSuccess: () => {
        useMqttStore.setState({ isConnected: true })
    },
    onFailure: () => {
        throw new Error('Cannot connect to MQTT Broker.')
    },
    keepAliveInterval: 120,
    reconnect: true,
})

export function useMqttSubscribe(topic: string) {
    const isConnected = useMqttStore((state) => state.isConnected)
    useEffect(() => {
        if (!isConnected) return
        client.subscribe(topic, { qos: 1 })
    }, [topic, isConnected])
}

export function mqttPublish(topic: string, payload: string) {
    const message = new Paho.Message(payload)
    message.destinationName = topic
    client.send(message)
}

const determineState = (parsedMessage: ParsedMessage) => {
    if (parsedMessage.state) {
        return parsedMessage.state === 'ON' ? true : false
    } else if (parsedMessage.contact) {
        return parsedMessage.contact
    } else if (parsedMessage.occupancy) {
        return parsedMessage.occupancy
    }
}

function onHandleMessage(message: Message) {
    const parsedMessage = JSON.parse(message.payloadString) as ParsedMessage
    if (RA.isNilOrEmpty(parsedMessage)) {
        return
    }
    useMqttStore
        .getState()
        .updateDeviceStatus(
            message.destinationName,
            determineState(parsedMessage)
        )
}

function onConnectionLost(responseObject: MQTTError) {
    if (responseObject.errorCode !== 0) {
        throw new Error('Lost MQTT connection')
    }
}
