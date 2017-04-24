Jello.Files = function() {
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
                        // console.log("Token", self.requestDigest.FormDigestValue);
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

    var CheckOutFile = function(config) {
        return $.Deferred(function(dfd) {
            $.when(_private.GetRequestDigest()).then(function(requestDigest) {
                var executor = new SP.RequestExecutor(config.context);
                var checkForCheckout = {
                    url: "_api/web/GetFileByServerRelativeUrl('" + encodeURIComponent(config.FileUrl.replace(/'/g, "''")) + "')/checkOutType",
                    method: "GET",
                    headers: {
                        "Accept": "application/json; odata=verbose",
                    },
                    success: function(data) {
                        data = JSON.parse(data.body);
                        if (data.d.CheckOutType === 0) {
                            dfd.resolve(data);
                        } else {
                            var info = {
                                url: "_api/web/GetFileByServerRelativeUrl('" + encodeURIComponent(config.FileUrl.replace(/'/g, "''")) + "')/CheckOut()",
                                method: "POST",
                                headers: {
                                    "Accept": "application/json; odata=verbose",
                                    "X-RequestDigest": requestDigest
                                },
                                contentType: "application/json;odata=verbose",
                                success: function(data) {
                                    //binary data available in data.body
                                    dfd.resolve(data);
                                },
                                error: function(err) {
                                    dfd.reject(err);
                                }
                            };
                            executor.executeAsync(info);

                        }
                    },
                    error: function(err) {
                        dfd.reject(err);

                    }
                };
                executor.executeAsync(checkForCheckout);
            });

        });
    };

    var CheckInFile = function(config) {
        return $.Deferred(function(dfd) {
            $.when(_private.GetRequestDigest()).then(function(requestDigest) {
                config.Comments = config.Comments ? config.Comments : "Auto check-in";
                var executor = new SP.RequestExecutor(config.context);
                var info = {
                    url: "_api/web/GetFileByServerRelativeUrl('" + encodeURIComponent(config.FileUrl.replace(/'/g, "''")) + "')/CheckIn(comment='" + config.Comments + "', checkintype=0)",
                    method: "POST",
                    headers: {
                        "Accept": "application/json; odata=verbose",
                        "X-RequestDigest": requestDigest
                    },
                    contentType: "application/json;odata=verbose",
                    success: function(data) {
                        //binary data available in data.body
                        dfd.resolve(data);
                    },
                    error: function(err) {
                        dfd.reject(err);
                    }
                };
                executor.executeAsync(info);
            });
        });
    };

    var ReadFile = function(context, fileContentUrl) {
        return $.Deferred(function(dfd) {
            var executor = new SP.RequestExecutor(context);
            var info = {
                url: fileContentUrl,
                method: "GET",
                binaryStringResponseBody: true,
                success: function(data) {
                    //binary data available in data.body
                    dfd.resolve(data.body);
                },
                error: function(err) {
                    dfd.reject(JSON.stringify(err));
                }
            };
            executor.executeAsync(info);
        });
    };

    var UploadFile = function(context, destinationFolderUrl, destinationFileName, data, bOverwrite) {
        return $.Deferred(function(dfd) {
            $.when(_private.GetRequestDigest()).done(function(reqDigest) {
                bOverwrite = bOverwrite ? bOverwrite : "false";
                var executor = new SP.RequestExecutor(context);
                var info = {
                    url: "_api/web/GetFolderByServerRelativeUrl('" + encodeURIComponent(destinationFolderUrl.replace(/'/g, "''")) + "')/Files/Add(url='" + destinationFileName + "',overwrite=" + bOverwrite + ")",
                    method: "POST",
                    headers: {
                        "Accept": "application/json; odata=verbose",
                        "X-RequestDigest": reqDigest
                    },
                    contentType: "application/json;odata=verbose",
                    binaryStringRequestBody: true,
                    body: data,
                    success: function(data) {
                        dfd.resolve(data);
                    },
                    error: function(err) {
                        dfd.reject(data);
                    }
                };
                executor.executeAsync(info);
            });

        });
    };

    var CopyFile = function(config) {
        return $.Deferred(function(dfd) {
            $.when(_private.GetRequestDigest()).done(function(reqDigest) {
                config.DestLibraryRelativePath = config.DestLibraryRelativePath.replace(/'/g, "''");
                config.DestFileName = config.DestFileName.replace(/'/g, "''");

                var _url = _spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/GetByTitle('" + config.SrcLibraryName + "')/GetItemById('" + config.SrcItemId + "')/File/copyTo(strNewUrl = '" + encodeURIComponent(config.DestLibraryRelativePath + "/" + config.DestFileName) + "',bOverWrite = " + config.boolReplace + ")";
                $.ajax({
                    cache: false,
                    url: _url,
                    type: "POST",
                    headers: {
                        "accept": "application/json;odata=verbose",
                        "X-RequestDigest": reqDigest,
                        "content-Type": "application/json;odata=verbose"
                    },
                    success: function(data) {
                        dfd.resolve(data);
                    },
                    error: function(data) {
                        dfd.reject(data);
                    }
                });
            });

        });

    };

    var UpdateFileMetadata = function(config) {
        return $.Deferred(function(dfd) {
            $.when(_private.GetRequestDigest(), RC.FileService.CheckOutFile(config))
                .done(function(reqDigest) {

                    var _url = _spPageContextInfo.webAbsoluteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURIComponent(config.FileUrl.replace(/'/g, "''")) + "')/ListItemAllFields";
                    $.ajax({
                        url: _url,
                        type: "PATCH",
                        headers: {
                            "Accept": "application/json;odata=verbose",
                            "Content-Type": "application/json;odata=verbose",
                            "X-RequestDigest": reqDigest,
                            "X-Http-Method": "PATCH",
                            "If-Match": "*"
                        },
                        data: config.UpdateData,
                        success: function(data) {
                            //fix to handle if user changes the name of the file. Check in would then fail.
                            var obj = JSON.parse(config.UpdateData);
                            if (obj.FileLeafRef) {
                                var urlArray = config.FileUrl.split('/');
                                urlArray[urlArray.length - 1] = obj.FileLeafRef;
                                config.FileUrl = urlArray.join('/');
                            }
                            $.when(RC.FileService.CheckInFile(config))
                                .done(function(data) {
                                    dfd.resolve(data);
                                }).fail(function(data) {
                                    dfd.reject(data);
                                });
                        },
                        error: function(data) {
                            dfd.reject(data);
                        }
                    });
                }).fail(function(data) {
                    dfd.reject(data);
                });

        });
    };

    var ApproveFile = function(config) {
        return $.Deferred(function(dfd) {
            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURIComponent(config.FileUrl.replace(/'/g, "''")) + "')/approve(comment='')",
                type: "Post",
                headers: {
                    "Accept": "application/json;odata=verbose",
                    "Content-Type": "application/json;odata=verbose",
                    "X-RequestDigest": $("#__REQUESTDIGEST").val(),
                    "If-Match": "*"
                },
                success: function(data) {
                    dfd.resolve(data);
                },
                error: function(data) {
                    dfd.reject(data);
                }
            });
        });
    };

    var DoesFileExist = function(config) {
        return $.Deferred(function(dfd) {
            $.ajax({
                cache: false,
                url: _spPageContextInfo.webAbsoluteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURIComponent(config.FileUrl.replace(/'/g, "''")) + "')/ListItemAllFields?" + config.ODataQuery,
                headers: {
                    "Accept": "application/json; odata=verbose",
                    "X-RequestDigest": $("#__REQUESTDIGEST").val()
                },
                type: "GET",
                success: function(data) {
                    dfd.resolve({
                        isExists: true,
                        data: data.d
                    });
                },
                error: function(err) {
                    dfd.resolve({
                        isExists: false,
                        data: null
                    });
                }
            });
        });
    };

    return {
        ReadFile: ReadFile,
        UploadFile: UploadFile,
        CheckOutFile: CheckOutFile,
        CheckInFile: CheckInFile,
        CopyFile: CopyFile,
        UpdateFileMetadata: UpdateFileMetadata,
        ApproveFile: ApproveFile,
        DoesFileExist: DoesFileExist
    };
};
