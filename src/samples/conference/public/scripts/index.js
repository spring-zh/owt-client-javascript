// MIT License
//
// Copyright (c) 2012 Universidad Politécnica de Madrid
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

// This file is borrowed from lynckia/licode with some modifications.

'use strict';
var conference;
var publicationGlobal;
const runSocketIOSample = function() {

    let localStream;
    let showedRemoteStreams = [];
    let myId;
    let subscriptionForMixedStream;
    let myRoom;
    var streamOutId;

    function getParameterByName(name) {
        name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
            results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(
            /\+/g, ' '));
    }

    var subscribeForward = getParameterByName('forward') === 'true'?true:false;
    var isSelf = getParameterByName('self') === 'false'?false:true;

    conference = new Owt.Conference.ConferenceClient();
    function renderVideo(stream){
        let subscirptionForward=null;
        function subscribeDifferentResolutionForward(forward, resolution){
            subscirptionForward && subscirptionForward.stop();
            subscirptionForward = null;
            const videoOptions = {};
            videoOptions.resolution = resolution;
            conference.subscribe(stream, {
                audio: true,
                video: videoOptions
            }).then((
                subscription) => {
                    subscirptionForward = subscription;
                $(`#${stream.id}`).get(0).srcObject = stream.mediaStream;
            });
        }
        let $p = $(`<div id=${stream.id}resolutions> </div>`)
        for (const resolution of stream.capabilities.video.resolutions) {
            const button = $('<button/>', {
                text: resolution.width + 'x' +
                    resolution.height,
                click: () => {
                    subscribeDifferentResolutionForward(stream, resolution);
                }
            });
            button.appendTo($p);
        };
        $p.appendTo($('body'));
        conference.subscribe(stream)
        .then((subscription)=>{
            subscirptionForward = subscription;
            let $video = $(`<video controls autoplay id=${stream.id} style="display:block" >this browser does not supported video tag</video>`);
           $video.get(0).srcObject = stream.mediaStream;
           $p.append($video);
        }, (err)=>{ console.log('subscribe failed', err);
        });
        stream.addEventListener('ended', () => {
            removeUi(stream.id);
            $(`#${stream.id}resolutions`).remove();
        });
    }
    function removeUi(id){
        $(`#${id}`).remove();
    }
    function subscribeDifferentResolution(stream, resolution) {
        subscriptionForMixedStream.stop();
        subscriptionForMixedStream = null;
        const videoOptions = {};
        videoOptions.resolution = resolution;
        conference.subscribe(stream, {
            audio: true,
            video: videoOptions
        }).then((
            subscription) => {
            subscriptionForMixedStream = subscription;
            $(`#${stream.id}`).get(0).srcObject = stream.mediaStream;
        });
    }

    conference.addEventListener('streamadded', (event) => {
        console.log('A new stream is added ', event.stream.id);
        isSelf = isSelf?isSelf:event.stream.id != publicationGlobal.id;
        subscribeForward && isSelf && renderVideo(event.stream);
        mixStream(myRoom, event.stream.id, 'common');
        event.stream.addEventListener('ended', () => {
            console.log(event.stream.id + ' is ended.');
        });
    });


    window.onload = function() {
        var myResolution = getParameterByName('resolution') || {
            width: 1280,
            height: 720
        };
        var shareScreen = getParameterByName('screen') || false;
        myRoom = getParameterByName('room');
        console.log('zsplog myRoom: '+ myRoom);
        var isHttps = (location.protocol === 'https:');
        var mediaUrl = getParameterByName('url');
        var isPublish = getParameterByName('publish');
        
        createToken(myRoom, 'user', 'presenter', function(response) {
            var token = response;
            conference.join(token).then(resp => {
                myId = resp.self.id;
                myRoom = resp.id;
                if(mediaUrl){
                     startStreamingIn(myRoom, mediaUrl);
                }
                if (isPublish !== 'false') {
                    const audioConstraintsForMic = new Owt.Base.AudioTrackConstraints(Owt.Base.AudioSourceInfo.MIC);
                    const videoConstraintsForCamera = new Owt.Base.VideoTrackConstraints(Owt.Base.VideoSourceInfo.CAMERA);
                    let mediaStream;
                    Owt.Base.MediaStreamFactory.createMediaStream(new Owt.Base.StreamConstraints(
                        audioConstraintsForMic, videoConstraintsForCamera)).then(stream => {
                        mediaStream = stream;
                        localStream = new Owt.Base.LocalStream(
                            mediaStream, new Owt.Base.StreamSourceInfo(
                                'mic', 'camera'));
                        let publishOptions = {
                            audio: [{ codec : { name: "opus" , clockRate: 48000, channelCount: 2} }],
                            video: [{ codec : { name: "h264", profile: "CB" } }]
                        };

                        $('.local video').get(0).srcObject = stream;
                        conference.publish(localStream, publishOptions).then(publication => {
                            publicationGlobal = publication;
                            mixStream(myRoom, publication.id, 'common')
                            publication.addEventListener('error', (err) => {
                                console.log('Publication error: ' + err.error.message);
                            });
                        });
                    }, err => {
                        console.error('Failed to create MediaStream, ' +
                            err);
                    });
                }
                var streams = resp.remoteStreams;
                for (const stream of streams) {
                    if(!subscribeForward){
                      if (stream.source.audio === 'mixed' || stream.source.video ===
                        'mixed') {
                        conference.subscribe(stream, {
                            audio: {codecs:[{name:'pcma'}]},
                            video: true
                        }).then((subscription) => {
                            subscriptionForMixedStream = subscription;
                            let $video = $(`<video controls autoplay id=${stream.id} style='display:block'>this browser does not supported video tag</video>`);
                            $video.get(0).srcObject = stream.mediaStream;
                            $('body').append($video);
                            subscription.addEventListener('error', (err) => {
                                console.log('Subscription error: ' + err.error.message);
                            })
                        });
                        for (const resolution of stream.capabilities.video.resolutions) {
                            const button = $('<button/>', {
                                text: resolution.width + 'x' +
                                    resolution.height,
                                click: () => {
                                    subscribeDifferentResolution(stream, resolution);
                                }
                            });
                            button.appendTo($('body'));
                        };
                      }

                      //try start stream out
                      startStreamingOut(myRoom, stream.id,"rtmp://112.74.73.206:1935/live/owt_mix_stream", function(response) {
                            let streamingOut = JSON.parse(response);
                            if(streamingOut != undefined){
                                streamOutId = streamingOut.id;
                            }
                            console.log('startStreamingOut:', streamingOut);
                      });
                    }else if(stream.source.audio !== 'mixed'){
                        subscribeForward && renderVideo(stream);
                    }
                }
                console.log('Streams in conference:', streams.length);
                var participants = resp.participants;
                console.log('Participants in conference: ' + participants.length);
            }, function(err) {
                console.error('server connection failed:', err);
                if (err.message.indexOf('connect_error:') >= 0) {
                    const signalingHost = err.message.replace('connect_error:', '');
                    const signalingUi = 'signaling';
                    removeUi(signalingUi);
                    let $p = $(`<div id=${signalingUi}> </div>`);
                    const anchor = $('<a/>', {
                        text: 'Click this for testing certificate and refresh',
                        target: '_blank',
                        href: `${signalingHost}/socket.io/`
                    });
                    anchor.appendTo($p);
                    $p.appendTo($('body'));
                }
            });
        });
    };
    window.onbeforeunload = function(event){
        if(streamOutId != this.undefined){
            stopStreamingOut(myRoom, streamOutId);
        }
        conference.leave()
        publicationGlobal.stop();
    };
};
