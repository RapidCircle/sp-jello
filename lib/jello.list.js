Jello.List = function(options) {
    var _private = (function() {
        var _requestDigest = null;
        var GetRequestDigest = function() {
            var dfd = $.Deferred();
            if (_requestDigest && _requestDigest.expiresOn > (new Date())) {
                return dfd.resolve(_requestDigest);
            } else {
                $.ajax({
                        type: "POST",
                        url: siteUrl + "/_api/contextinfo",
                        headers: {
                            "accept": "application/json;odata=verbose"
                        }
                    }).done(function(resp) {
                        var now = (new Date()).getTime();
                        _requestDigest = resp.d.GetContextWebInformation;
                        _requestDigest.expiresOn = now + (resp.d.GetContextWebInformation.FormDigestTimeoutSeconds * 1000) - 60000; // -60000 To prevent any calls to fail at all, by refreshing a minute before
                        dfd.resolve(_requestDigest.FormDigestValue);
                    })
                    .fail(function(err) {
                        console.log("Error fetching Request Digest. Some parts won't work.");
                        dfd.reject(err);
                    });
            }
            return dfd.promise();
        };
        return {
            GetRequestDigest: GetRequestDigest
        };
    })();

    var siteUrl = options.site;

    var add = function(opt) {
        var dfd = $.Deferred();
        _private.GetRequestDigest().then(function(requestDigest) {
            $.ajax({
                url: siteUrl + "/_api/web/lists",
                type: "POST",
                headers: {
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": requestDigest
                },
                data: JSON.stringify({
                    '__metadata': {
                        'type': 'SP.List'
                    },
                    'AllowContentTypes': opt.AllowContentTypes,
                    'BaseTemplate': opt.BaseTemplate,
                    'ContentTypesEnabled': opt.ContentTypesEnabled,
                    'Description': opt.Description,
                    'Title': opt.Title
                })
            }).done(function(resp) {
                dfd.resolve(resp);
            }).fail(function(err) {
                dfd.reject(err);
            });
        }, function(err) {
            dfd.reject(err);
        });

        return dfd.promise();
    };
    return {
        add: add
    };
};
