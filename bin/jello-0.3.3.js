var Jello = function(siteUrl) {
    var self = this;
    this.siteUrl = siteUrl;
    this.requestDigest = null;

    //private
    var GetRequestDigest = function() {
        var dfd = $.Deferred();
        if (self.requestDigest && self.requestDigest.expiresOn > (new Date())) {
            return dfd.resolve();
        } else {
            $.ajax({
                    type: "POST",
                    url: siteUrl + "/_api/contextinfo",
                    headers: {
                        "accept": "application/json;odata=verbose"
                    }
                }).done(function(resp) {
                    var now = (new Date()).getTime();
                    self.requestDigest = resp.d.GetContextWebInformation;
                    self.requestDigest.expiresOn = now + (resp.d.GetContextWebInformation.FormDigestTimeoutSeconds * 1000) - 60000; // -60000 To prevent any calls to fail at all, by refreshing a minute before
                    console.log("Token", self.requestDigest.FormDigestValue);
                    dfd.resolve();
                })
                .fail(function(err) {
                    console.log("Error fetching Request Digest. Some parts won't work.");
                    dfd.reject();
                });
        }

        return dfd.promise();
    };
    this.Web = function() {
        //do stuff with web
        throw ("Not implemented");
    };

    this.List = function() {
        //do stuff with web
        throw ("Not implemented");
    };

    this.Files = function(options) {
        throw ("Not implemented");
    };

    //do stuff with list items
    this.ListItems = function(options) {
        var list = options.name;
        var filterObj = {
            filter: null,
            expand: null,
            select: null,
            orderBy: null
        };
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
            GetRequestDigest().then(function() {
                item.__metadata = {
                    type: contentType
                };
                var payload = JSON.stringify(item);
                $.ajax({
                    type: 'POST',
                    headers: {
                        "accept": "application/json;odata=verbose",
                        "content-type": "application/json;odata=verbose",
                        "X-RequestDigest": self.requestDigest.FormDigestValue
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

            GetRequestDigest().then(function() {

                $.ajax({
                    type: 'POST',
                    headers: {
                        "X-RequestDigest": self.requestDigest.FormDigestValue,
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

            GetRequestDigest().then(function() {
                update.__metadata = {
                    type: contentType
                };

                var payload = JSON.stringify(update);
                $.ajax({
                    type: 'POST',
                    headers: {
                        "accept": "application/json;odata=verbose",
                        "content-type": "application/json;odata=verbose",
                        "X-RequestDigest": self.requestDigest.FormDigestValue,
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
    };

    this.Taxonomy = function(options) {
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
};
module.exports = Jello;
