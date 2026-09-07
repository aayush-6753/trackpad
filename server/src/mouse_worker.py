#!/usr/bin/env python3

import json
import sys
import time

from evdev import UInput, ecodes as e


KEYS = [
    e.BTN_LEFT,
    e.BTN_RIGHT,
    e.BTN_MIDDLE,
    e.KEY_LEFTCTRL,
    e.KEY_LEFTALT,
    e.KEY_LEFTMETA,
    e.KEY_A,
    e.KEY_ESC,
    e.KEY_PAGEUP,
    e.KEY_PAGEDOWN,
    e.KEY_VOLUMEUP,
    e.KEY_VOLUMEDOWN,
    e.KEY_PREVIOUSSONG,
    e.KEY_NEXTSONG,
]

CAPABILITIES = {
    e.EV_KEY: KEYS,
    e.EV_REL: [
        e.REL_X,
        e.REL_Y,
        e.REL_WHEEL,
        e.REL_HWHEEL,
    ],
}

BUTTONS = {
    "left": e.BTN_LEFT,
    "right": e.BTN_RIGHT,
    "middle": e.BTN_MIDDLE,
}


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, int(value)))


with UInput(
    CAPABILITIES,
    name="Phone Wireless Trackpad",
    bustype=e.BUS_USB,
) as device:

    pressed_buttons = set()

    def press_key(key):
        device.write(e.EV_KEY, key, 1)
        device.syn()

    def release_key(key):
        device.write(e.EV_KEY, key, 0)
        device.syn()

    def tap_key(key):
        press_key(key)
        release_key(key)

    def press_combination(*keys):
        for key in keys:
            device.write(e.EV_KEY, key, 1)

        device.syn()

        for key in reversed(keys):
            device.write(e.EV_KEY, key, 0)

        device.syn()

    def click(button_name):
        key = BUTTONS[button_name]
        press_key(key)
        release_key(key)

    def button_down(button_name):
        key = BUTTONS[button_name]

        if key not in pressed_buttons:
            pressed_buttons.add(key)
            press_key(key)

    def button_up(button_name):
        key = BUTTONS[button_name]

        if key in pressed_buttons:
            pressed_buttons.remove(key)
            release_key(key)

    def release_everything():
        for key in list(pressed_buttons):
            device.write(e.EV_KEY, key, 0)

        pressed_buttons.clear()
        device.syn()

    # Give Wayland time to recognize the virtual input device.
    time.sleep(0.5)
    print("Mouse worker ready", flush=True)

    for line in sys.stdin:
        try:
            message = json.loads(line)
            message_type = message.get("type")

            if message_type == "move":
                dx = clamp(message.get("dx", 0), -200, 200)
                dy = clamp(message.get("dy", 0), -200, 200)

                if dx:
                    device.write(e.EV_REL, e.REL_X, dx)

                if dy:
                    device.write(e.EV_REL, e.REL_Y, dy)

                device.syn()

            elif message_type == "leftClick":
                click("left")

            elif message_type == "rightClick":
                click("right")

            elif message_type == "middleClick":
                click("middle")

            elif message_type == "leftDown":
                button_down("left")

            elif message_type == "leftUp":
                button_up("left")

            elif message_type == "scroll":
                horizontal = clamp(message.get("x", 0), -5, 5)
                vertical = clamp(message.get("y", 0), -5, 5)

                if horizontal:
                    device.write(
                        e.EV_REL,
                        e.REL_HWHEEL,
                        horizontal,
                    )

                if vertical:
                    device.write(
                        e.EV_REL,
                        e.REL_WHEEL,
                        vertical,
                    )

                device.syn()

            elif message_type == "zoom":
                amount = clamp(message.get("amount", 0), -3, 3)

                press_key(e.KEY_LEFTCTRL)
                device.write(e.EV_REL, e.REL_WHEEL, amount)
                device.syn()
                release_key(e.KEY_LEFTCTRL)

            elif message_type == "overview":
                tap_key(e.KEY_LEFTMETA)

            elif message_type == "applications":
                press_combination(
                    e.KEY_LEFTMETA,
                    e.KEY_A,
                )

            elif message_type == "exitOverview":
                tap_key(e.KEY_ESC)

            elif message_type == "workspaceLeft":
                press_combination(
                    e.KEY_LEFTMETA,
                    e.KEY_PAGEUP,
                )

            elif message_type == "workspaceRight":
                press_combination(
                    e.KEY_LEFTMETA,
                    e.KEY_PAGEDOWN,
                )

            elif message_type == "volumeUp":
                tap_key(e.KEY_VOLUMEUP)

            elif message_type == "volumeDown":
                tap_key(e.KEY_VOLUMEDOWN)

            elif message_type == "previousMedia":
                tap_key(e.KEY_PREVIOUSSONG)

            elif message_type == "nextMedia":
                tap_key(e.KEY_NEXTSONG)

            elif message_type == "releaseAll":
                release_everything()

        except Exception as error:
            print(
                f"Ignored input error: {error}",
                file=sys.stderr,
                flush=True,
            )