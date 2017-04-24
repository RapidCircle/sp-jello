var Jello = (function() {
    return {};
})();

//module.exports = Jello;

Jello.Constants = function() {
    var List = {
        Template: {
            "GenericList": 100,
            "DocumentLibrary": 101,
            "Survey": 102,
            "Links": 103,
            "Announcements": 104,
            "Contacts": 105,
            "Events": 106,
            "Tasks": 107,
            "DiscussionBoard": 108,
            "PictureLibrary": 109
        }
    };
    var Web = {
        Template: {
            "TeamSite": 0,
            "BlankSite": 1
        }
    };
    var Language = {
        English: 1033,
        Dutch: 1043
    };
    return {
        List: List,
        Web: Web,
        Language: Language
    };
}();

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

Jello.ListItems = (function(options) {
    var _private = (function(){
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
        GetRequestDigest : GetRequestDigest
      };
    })();

    var filterObj = {
        filter: null,
        expand: null,
        select: null,
        orderBy: null
    };

    var siteUrl = options.site;
    var list = options.list;
    var contentType = options.contentType;

    var get = function(top) {
        var dfd = $.Deferred();
        var filter = "";

        // If filter is set, execute
        if (filterObj.select || filterObj.filter || filterObj.expand || filterObj.orderBy) {
            if (filterObj.expand)
                filter = (filter.length > 0) ? filter + "&" + filterObj.expand : filter + "?" + filterObj.expand;

            if (filterObj.select)
                filter = (filter.length > 0) ? filter + "&" + filterObj.select : filter + "?" + filterObj.select;

            if (filterObj.filter)
                filter = (filter.length > 0) ? filter + "&" + filterObj.filter : filter + "?" + filterObj.filter;

            if (filterObj.orderBy)
                filter = (filter.length > 0) ? filter + "&" + filterObj.orderBy : filter + "?" + filterObj.orderBy;

            if (top)
                filter = (filter.length > 0) ? filter + "&$top=" + top : filter + "?$top=" + top;

            // Reset the filter
            filterObj = {
                filter: null,
                expand: null,
                select: null,
                orderBy: null
            };
        } else {
            filter = (top) ? "?$top=" + top : "";
        }

        url = siteUrl + "/_api/web/lists/getbytitle('" + list + "')/items" + filter;
        $.ajax({
            type: 'GET',
            headers: {
                "accept": "application/json;odata=verbose"
            },
            url: url
        }).done(function(resp) {
            // Add paging methods
            resp.next = function() {
                var dfd_next = $.Deferred();
                get(null, resp.d.__next).then(function(next_res) {
                    dfd_next.resolve(next_res);
                }, function(err) {
                    dfd_next.reject(err);
                });
                return dfd_next.promise();
            };

            resp.prev = function() {
                var dfd_prev = $.Deferred();
                get(null, resp.d.__prev).then(function(prev_res) {
                    dfd_prev.resolve(prev_res);
                }, function(err) {
                    dfd_prev.reject(err);
                });
                return dfd_prev.promise();
            };
            dfd.resolve(resp);
        }).fail(function(err) {
            dfd.reject(err);
        });

        return dfd.promise();
    };

    var getById = function(id) {
        var dfd = $.Deferred();

        if (!id)
            throw ("Provided ID is not valid");

        $.ajax({
            type: 'GET',
            headers: {
                "accept": "application/json;odata=verbose"
            },
            url: siteUrl + "/_api/web/lists/getbytitle('" + list + "')/items(" + id + ")"
        }).done(function(resp) {
            dfd.resolve(resp);
        }).fail(function(err) {
            dfd.reject(err);
        });

        return dfd.promise();
    };
    var add = function(item) {
        var dfd = $.Deferred();
        _private.GetRequestDigest().then(function(requestDigest) {
            item.__metadata = {
                type: contentType
            };
            var payload = JSON.stringify(item);
            $.ajax({
                type: 'POST',
                headers: {
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": requestDigest
                },
                data: payload,
                url: siteUrl + "/_api/web/lists/getbytitle('" + list + "')/items"
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
    var remove = function(id, etag) {
        // if etag not provided, overwrite item even if outdated
        if (!etag)
            etag = "*";
        var dfd = $.Deferred();

        _private.GetRequestDigest().then(function(requestDigest) {

            $.ajax({
                type: 'POST',
                headers: {
                    "X-RequestDigest": requestDigest,
                    "X-HTTP-Method": "DELETE",
                    "If-Match": etag
                },
                url: siteUrl + "/_api/web/lists/getbytitle('" + list + "')/items(" + id + ")"
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
    var update = function(id, update, etag) {

        // if etag not provided, overwrite item even if outdated
        if (!etag)
            etag = "*";

        var dfd = $.Deferred();

        _private.GetRequestDigest().then(function(requestDigest) {
            update.__metadata = {
                type: contentType
            };

            var payload = JSON.stringify(update);
            $.ajax({
                type: 'POST',
                headers: {
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": requestDigest,
                    "X-HTTP-Method": "MERGE",
                    "If-Match": etag
                },
                data: payload,
                url: siteUrl + "/_api/web/lists/getbytitle('" + list + "')/items(" + id + ")"
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
    var query = function(filter) {
        var dfd = $.Deferred();
        filter = (filter) ? "?" + filter : "";
        $.ajax({
            type: 'GET',
            headers: {
                "accept": "application/json;odata=verbose"
            },
            url: siteUrl + "/_api/web/lists/getbytitle('" + list + "')/items" + filter
        }).done(function(resp) {
            dfd.resolve(resp);
        }).fail(function(err) {
            dfd.reject(err);
        });
        return dfd.promise();
    };

    var where = function(filter) {
        filterObj.filter = "$filter=" + filter;
        return this;
    };
    var expand = function(filter) {
        filterObj.expand = "$expand=" + filter;
        return this;
    };
    var select = function(filter) {
        filterObj.select = "$select=" + filter;
        return this;
    };
    var orderBy = function(filter) {
        filterObj.orderBy = "$orderby=" + filter;
        return this;
    };

    return {
        get: get,
        getById: getById,
        add: add,
        remove: remove,
        update: update,
        query: query,
        where: where,
        expand: expand,
        select: select,
        orderBy: orderBy
    };
});

Jello.Taxonomy = function(options) {

    if (!SP.Taxonomy) {
        throw ("SP.Taxonomy is not loaded. Please ensure SP.Taxonomy is loaded before proceeding.");
    }
    if (!options.TermStore) {
        throw ("TermStore null or undefined");
    }

    var TermStore = options.TermStore;

    var getAllTerms = function(TermSetId) {
        if (!TermSetId) {
            throw ("Term set ID null or undefined.");
        }
        return $.Deferred(function(dfd) {
            var context = SP.ClientContext.get_current();
            var taxSession = SP.Taxonomy.TaxonomySession.getTaxonomySession(context);
            var termStores = taxSession.get_termStores();
            var termStore = termStores.getByName(TermStore);
            var termSet = termStore.getTermSet(TermSetId);
            var terms = termSet.getAllTerms();
            context.load(terms);
            context.executeQueryAsync(function() {
                dfd.resolve(terms);
            }, function(sender, args) {
                dfd.reject(args);
            });
        });
    };

    var addTermGroup = function(options) {
        if (!options || !options.Name || !options.GUID) {
            throw ("Name or GUID is null or undefined");
        }
        return $.Deferred(function(dfd) {
            var context = SP.ClientContext.get_current();
            var taxSession = SP.Taxonomy.TaxonomySession.getTaxonomySession(context);
            var termStores = taxSession.get_termStores();
            var termStore = termStores.getByName(TermStore);
            var group = termStore.createGroup(options.Name, options.GUID);
            context.load(group);
            context.executeQueryAsync(function() {
                dfd.resolve(group);
            }, function(sender, args) {
                dfd.reject(args);
            });
        });
    };

    var addTermSet = function(options) {
        if (!options || !options.GroupGUID || !options.TermSetName || !options.TermSetGUID || !options.TermSetLCID) {
            throw ("One or more parameters null or undefined. Required parameters are GroupGUID, TermSetName, TermSetGUID, TermSetLCID");
        }
        return $.Deferred(function(dfd) {
            var context = SP.ClientContext.get_current();
            var taxSession = SP.Taxonomy.TaxonomySession.getTaxonomySession(context);
            var termStores = taxSession.get_termStores();
            var termStore = termStores.getByName(TermStore);
            var peopleGroup = termStore.getGroup(options.GroupGUID);
            var termset = peopleGroup.createTermSet(options.TermSetName, options.TermSetGUID, options.TermSetLCID);
            context.load(termset);
            context.executeQueryAsync(function() {
                dfd.resolve(termset);
            }, function(sender, args) {
                dfd.reject(args);
            });
        });
    };

    var addTerm = function(options) {
        if (!options || !options.TermSetGUID || !options.TermName || !options.TermLCID || !options.TermGUID) {
            throw ("One or more parameters null or undefined. Required parameters are TermSetGUID, TermName, TermLCID, TermGUID");
        }
        return $.Deferred(function(dfd) {
            var context = SP.ClientContext.get_current();
            var taxSession = SP.Taxonomy.TaxonomySession.getTaxonomySession(context);
            var termStores = taxSession.get_termStores();
            var termStore = termStores.getByName(TermStore);
            var termSet = termStore.getTermSet(options.TermSetGUID);
            var term = termSet.createTerm(options.TermName, options.TermLCID, options.TermGUID);
            term.set_isAvailableForTagging(options.isAvailableForTagging);
            context.load(term);
            context.executeQueryAsync(function() {
                dfd.resolve(term);
            }, function(sender, args) {
                dfd.reject(args);
            });

        });
    };

    var getWssIdFromGuid = function(GUID) {
        if (!GUID) {
            throw ("GUID is null or undefined.");
        }
        return $.Deferred(function(dfd) {
            var viewXml = '<View><Query><Where><Eq><FieldRef Name="IdForTerm"/><Value Type="Text">' + GUID + '</Value></Eq></Where></Query></View>';
            var context = SP.ClientContext.get_current();
            var oList = context.get_web().get_lists().getByTitle('TaxonomyHiddenList');
            var camlQuery = new SP.CamlQuery();
            camlQuery.set_viewXml(viewXml);
            var collTermListItem = oList.getItems(camlQuery);
            context.load(collTermListItem);
            context.executeQueryAsync(function() {
                var listItemEnumerator = collTermListItem.getEnumerator();
                var output_array = [];
                while (listItemEnumerator.moveNext()) {
                    var oListItem = listItemEnumerator.get_current();
                    output_array.push(oListItem.get_id());
                }
                dfd.resolve(output_array);
            }, function(sender, args) {
                dfd.reject(args);
            });
        });
    };

    return {
        getAllTerms: getAllTerms,
        addTermGroup: addTermGroup,
        addTermSet: addTermSet,
        addTerm: addTerm,
        getWssIdFromGuid: getWssIdFromGuid
    };
};

Jello.Web = function(options) {
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

    var siteUrl = options.site;

    var add = function(opt) {
        var dfd = $.Deferred();
        _private.GetRequestDigest().then(function(requestDigest) {
            $.ajax({
                url: siteUrl + "/_api/web/webinfos/add",
                type: "POST",
                headers: {
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": requestDigest
                },
                data: JSON.stringify({
                    'parameters': {
                        '__metadata': {
                            'type': 'SP.WebInfoCreationInformation'
                        },
                        'Url': opt.siteUrl,
                        'Title': opt.siteName,
                        'Description': opt.siteDescription,
                        'Language': opt.Language,
                        'WebTemplate': opt.siteTemplate,
                        'UseUniquePermissions': opt.uniquePermissions
                    }
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
