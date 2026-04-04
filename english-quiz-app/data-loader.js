// ===== Shared JSON Data Loader =====
// Caches in-flight/completed JSON fetches to avoid duplicate network/parsing work.
(function () {
    'use strict';

    var _cache = Object.create(null);

    function _fetchJson(path) {
        return fetch(path).then(function (res) {
            if (!res.ok) throw new Error('Failed to load ' + path + ' (' + res.status + ')');
            return res.json();
        });
    }

    function _getOrCreate(key, loader) {
        if (_cache[key]) return _cache[key];
        _cache[key] = loader().catch(function (err) {
            delete _cache[key];
            throw err;
        });
        return _cache[key];
    }

    var api = {
        getJson: function (path) {
            return _getOrCreate(path, function () {
                return _fetchJson(path);
            });
        },

        getWords: function () {
            return api.getJson('words.json');
        },

        getPhrasesPayload: function () {
            return api.getJson('phrases.json');
        },

        getPhrasesList: function () {
            return api.getPhrasesPayload().then(function (payload) {
                return Array.isArray(payload && payload.phrases) ? payload.phrases : [];
            });
        },

        clear: function (path) {
            if (path) delete _cache[path];
        }
    };

    window.AppDataLoader = api;
})();
