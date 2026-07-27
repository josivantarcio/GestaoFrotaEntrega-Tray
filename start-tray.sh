#!/usr/bin/env bash
export ROUTELOG_DASHBOARD_URL="http://localhost:3000/dashboard"
export ROUTELOG_SSE_URL="http://localhost:3000/api/events"
export DISPLAY="${DISPLAY:-:0}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=/run/user/$(id -u)/bus}"
cd "/home/josivan/ws/JTarcio Softhouse/shopee-log/logistica-tray"
exec "/home/josivan/ws/JTarcio Softhouse/shopee-log/logistica-tray/node_modules/.bin/electron" . --no-sandbox
