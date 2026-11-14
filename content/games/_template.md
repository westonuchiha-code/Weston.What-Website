---
# COPY THIS FILE to add a game. Files starting with _ are ignored by the build.
# Rename the copy, e.g. content/games/space-blaster.md -> lives at /arcade/space-blaster/
#
# title:       name on the cabinet
# src:         where the game lives. Two options:
#                /games/space-blaster/            a game YOU host: put its files in public/games/space-blaster/
#                https://example.itch.io/embed/…  a game hosted elsewhere (must be https and allow embedding)
# thumb:       160x120 picture for the cabinet screen (GIF or PNG in public/img/arcade/)
# description: one or two sentences for the cabinet
# controls:    how to play
# touch:       yes | partial | no      (no = keyboard needed; the cabinet says so)
# aspect:      4:3 | 16:9 | 1:1 …      shape of the game screen
# credit:      who made it, and its license if it's not yours
# order:       lower numbers come first
# sandbox:     (optional) iframe permissions. Default:
#              allow-scripts allow-same-origin allow-pointer-lock
# type:        (optional) placeholder = show as an empty "out of order" cabinet
title: SPACE BLASTER
src: /games/space-blaster/
thumb: /img/arcade/empty-slot.gif
description: One line about the game.
controls: Arrow keys to move, Space to fire.
touch: no
aspect: 4:3
order: 10
---
Longer notes about the game go here. They show up under the game on its page.
