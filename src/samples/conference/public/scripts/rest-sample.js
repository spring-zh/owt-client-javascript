// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

// REST samples. It sends HTTP requests to sample server, and sample server sends requests to conference server.
// Both this file and sample server are samples.
'use strict';
var send = function (method, path, body, onRes, host) {
    var req = new XMLHttpRequest()
    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            onRes(req.responseText);
        }
    };
    let url = generateUrl(host, path);
    console.log('[rest-sample.js send] zsplog generateUrl: '+ url + ' method:' + method);
    req.open(method, url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    if (body !== undefined) {
        req.send(JSON.stringify(body));
    } else {
        req.send();
    }
};

var generateUrl = function(host, path) {
    let url;
    if (host !== undefined) {
        url = host + path;  // Use the host user set.
    }else {
        let u = new URL(document.URL);
        url = u.origin + path;  // Get the string before last '/'.
    }
    return url;
}

var onResponse = function (result) {
    if (result) {
        try {
            console.info('Result:', JSON.parse(result));
        } catch (e) {
            console.info('Result:', result);
        }
    } else {
        console.info('Null');
    }
};

var mixStream = function (room, stream, view, host) {
    var jsonPatch = [{
        op: 'add',
        path: '/info/inViews',
        value: view
    }];
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch,
        onResponse, host);
};

var startStreamingIn = function (room, inUrl, host) {
    var options = {
        url: inUrl,
        media: {
            audio: 'auto',
            video: true
        },
        transport: {
            protocol: 'udp',
            bufferSize: 2048
        }
    };
    send('POST', '/rooms/' + room + '/streaming-ins', options, onResponse, host);
};

// var startStreamingIn = function (room, inUrl, host) {
//     var options = {
//         connection : {
//             url: inUrl,
//             transportProtocol: "tcp",
//             bufferSize: 2048
//         },
//         media: {
//             audio: 'auto',
//             video: true
//         }
//     };
//     send('POST', '/rooms/' + room + '/streaming-ins', options, onResponse, host);
// };

//StreamingOut

var listStreamingOut = function (room, callback, host) {
    send('GET', '/rooms/' + room + '/streaming-outs', undefined, callback, host);
}

var startStreamingOut = function (room, stream ,outUrl, callback, host) {
    var mediaSubOption = {
         audio: {
             from: stream,
             format: {
                 codec: "aac",
                 sampleRate: 44100,
                 channelNum: 2
             }
         },
        video: {
            from: stream,
            format: {
                codec: "h264",
                profile: "CB"
            },
            parameters: {
                keyFrameInterval: 100,
                framerate: 24,
                resolution: {
                    height: 480,
                    width: 640
                }
            },
        }
    };

    var hlsParameters = {
        method: "PUT",
        hlsTime: undefined,
        hlsListSize: undefined
    };

    var options = {
        protocol: "rtmp",
        url: outUrl,
        parameters: hlsParameters,
        media: mediaSubOption
    };
    
    send('POST', '/rooms/' + room + '/streaming-outs', options, callback, host);
};

var stopStreamingOut = function (room, streamout, callback, host) {
    send('DELETE', '/rooms/' + room + '/streaming-outs/' + streamout, undefined, callback, host);
}

var createToken = function (room, user, role, callback, host) {
    var body = {
        room: room,
        user: user,
        role: role
    };
    send('POST', '/tokens/', body, callback, host);
};

var createRoom = function (roomConfig, callback, host) {
    send('POST', '/rooms/', roomConfig, callback, host);
};

var listRooms = function (callback, host) {
    send('GET', '/rooms/', undefined, callback, host);
};

var getRoom = function (roomid, callback, host) {
    send('GET', '/rooms/' + roomid, undefined, callback, host);
};

var deleteRoom = function (roomid, callback, host) {
    send('DELETE', '/rooms/' + roomid, undefined, callback, host);
};

var listStreams = function (roomid, callback, host) {
    send('GET', '/rooms/' + roomid + "/streams", undefined, callback, host);
};

var getStream = function (roomid, streamid, callback, host) {
    send('GET', '/rooms/' + roomid + "/streams/" + streamid, undefined, callback, host);
};

var getDefaultRoom = function (){
    
    let room_cfg = {
        // "_id": undefined,
        // "name": undefined,
        notifying: {
            streamChange: true,
            participantActivities: true
        },
        transcoding: {
            video: {
                parameters: {
                    keyFrameInterval: true,
                    bitrate: true,
                    framerate: true,
                    resolution: true
                },
                format: true
            },
            audio: true
        },
        mediaOut: {
            video: {
                parameters: {
                    keyFrameInterval: [
                        100,
                        30,
                        5,
                        2,
                        1
                    ],
                    bitrate: [
                        "x0.8",
                        "x0.6",
                        "x0.4",
                        "x0.2"
                    ],
                    framerate: [
                        6,
                        12,
                        15,
                        24,
                        30,
                        48,
                        60
                    ],
                    resolution: [
                        "x3/4",
                        "x2/3",
                        "x1/2",
                        "x1/3",
                        "x1/4",
                        "hd1080p",
                        "hd720p",
                        "svga",
                        "vga",
                        "qvga",
                        "cif"
                    ]
                },
                format: [
                    {
                        codec: "vp8"
                    },
                    {
                        profile: "CB",
                        codec: "h264"
                    },
                    {
                        codec: "vp9"
                    }
                ]
            },
            audio: [
                {
                    channelNum: 2,
                    sampleRate: 48000,
                    codec: "opus"
                },
                {
                    sampleRate: 16000,
                    codec: "isac"
                },
                {
                    sampleRate: 32000,
                    codec: "isac"
                },
                {
                    channelNum: 1,
                    sampleRate: 16000,
                    codec: "g722"
                },
                {
                    codec: "pcma"
                },
                {
                    codec: "pcmu"
                },
                {
                    channelNum: 2,
                    sampleRate: 48000,
                    codec: "aac"
                },
                {
                    channelNum: 2,
                    sampleRate: 44100,
                    codec: "aac"
                },
                {
                    channelNum: 2,
                    sampleRate: 32000,
                    codec: "aac"
                }
            ]
        },
        mediaIn: {
            video: [
                {
                    codec: "h264"
                },
                {
                    codec: "vp8"
                },
                {
                    codec: "vp9"
                }
            ],
            audio: [
                {
                    channelNum: 2,
                    sampleRate: 48000,
                    codec: "opus"
                },
                {
                    sampleRate: 16000,
                    codec: "isac"
                },
                {
                    sampleRate: 32000,
                    codec: "isac"
                },
                {
                    channelNum: 1,
                    sampleRate: 16000,
                    codec: "g722"
                },
                {
                    codec: "pcma"
                },
                {
                    codec: "pcmu"
                },
                {
                    codec: "aac"
                },
                {
                    codec: "ac3"
                },
                {
                    codec: "nellymoser"
                },
                {
                    codec: "ilbc"
                }
            ]
        },
        views: [
            {
                video: {
                    layout: {
                        templates: {
                            custom: [],
                            base: "fluid"
                        },
                        fitPolicy: "letterbox"
                    },
                    keepActiveInputPrimary: false,
                    bgColor: {
                        b: 0,
                        g: 0,
                        r: 0
                    },
                    motionFactor: 0.8,
                    maxInput: 16,
                    parameters: {
                        keyFrameInterval: 100,
                        framerate: 24,
                        resolution: {
                            height: 480,
                            width: 640
                        }
                    },
                    format: {
                        codec: "vp8"
                    }
                },
                audio: {
                    vad: true,
                    format: {
                        codec: "opus",
                        sampleRate: 48000,
                        channelNum: 2
                    }
                },
                label: "common"
            }
        ],
        roles: [
            {
                subscribe: {
                    video: true,
                    audio: true
                },
                publish: {
                    video: true,
                    audio: true
                },
                role: "presenter"
            },
            {
                subscribe: {
                    video: true,
                    audio: true
                },
                publish: {
                    video: false,
                    audio: false
                },
                role: "viewer"
            },
            {
                subscribe: {
                    video: false,
                    audio: true
                },
                publish: {
                    video: false,
                    audio: true
                },
                role: "audio_only_presenter"
            },
            {
                subscribe: {
                    video: true,
                    audio: false
                },
                publish: {
                    video: false,
                    audio: false
                },
                role: "video_only_viewer"
            },
            {
                subscribe: {
                    video: true,
                    audio: true
                },
                publish: {
                    video: true,
                    audio: true
                },
                role: "sip"
            }
        ],
        participantLimit: -1,
        inputLimit: -1,
        __v: 0
    };
    return room_cfg;
}
