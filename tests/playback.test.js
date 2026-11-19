const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const player = read('sidepanel.js');
const seekRuntime = player.slice(player.indexOf('function setPlaybackMessage('), player.indexOf('/**\n * Plays a saved note'));
const worker = read('background.js');
const relayRuntime = worker.slice(worker.indexOf('const pendingYouTubeConnections'), worker.indexOf('/**\n * Reads the current'));
const videoId = 'abcdefghijk';
const watch = { id: 123, url: `https://www.youtube.com/watch?v=${videoId}` };
const payload = { action: 'seekTo', seconds: 80, videoId };

function harness({ send, inject, getTab } = {}) {
  const status = { textContent: 'Previous error', hidden: false };
  const calls = [];
  const context = {
    URL, currentVideoId: videoId, youtubeTabId: watch.id,
    document: { getElementById: () => status }, console: { error() {} },
    chrome: {
      tabs: {
        get: async () => getTab ? getTab() : watch,
        query: async () => { throw new Error('Must use the bound tab'); },
        sendMessage: async (id, message, { frameId }) => {
          calls.push(['send', id, frameId, message.videoId]);
          return send ? send() : { success: true };
        },
      },
      scripting: { executeScript: async ({ target, files }) => {
        calls.push(['inject', target.tabId, files[0]]);
        if (inject) await inject();
      } },
      runtime: { sendMessage: message => context.relayToYouTube(message) },
    },
  };
  vm.createContext(context);
  vm.runInContext(relayRuntime + seekRuntime, context);
  return { context, calls, status };
}

test('normal playback targets only the bound video and clears earlier feedback', async () => {
  const { context, calls, status } = harness();
  assert.equal(await context.seekTo(80), true);
  assert.deepEqual(calls, [['send', watch.id, 0, videoId]]);
  assert.equal(status.hidden, true);
});

test('an already-open page reconnects once even when two requests arrive together', async () => {
  let ready = false;
  const { context, calls, status } = harness({
    send: () => {
      if (!ready) throw new Error('Could not establish connection. Receiving end does not exist.');
      return { success: true };
    },
    inject: () => { ready = true; },
  });
  const results = await Promise.all([context.seekTo(80), context.relayToYouTube({ tabId: watch.id, payload })]);
  assert.equal(results[0], true);
  assert.equal(results[1].response.success, true);
  assert.equal(calls.filter(([action]) => action === 'inject').length, 1);
  assert.equal(status.hidden, true);
});

test('a tab that navigates during recovery never receives a stale seek', async () => {
  let activeTab = watch;
  const { context, calls, status } = harness({
    getTab: () => activeTab,
    send: () => { throw new Error('Receiving end does not exist.'); },
    inject: () => { activeTab = { ...watch, url: 'https://www.youtube.com/watch?v=12345678901' }; },
  });
  assert.equal(await context.seekTo(80), false);
  assert.deepEqual(calls.map(call => call[0]), ['send', 'inject']);
  assert.match(status.textContent, /点击时间戳重试/);
});

test('ambiguous failures are not replayed and invalid timestamps send nothing', async () => {
  const { context, calls } = harness({ send: () => { throw new Error('The message port closed before a response was received.'); } });
  assert.equal(await context.seekTo(80), false);
  for (const value of [null, undefined, NaN, -1, 'wrong']) assert.equal(await context.seekTo(value), false);
  assert.deepEqual(calls.map(call => call[0]), ['send']);
});
