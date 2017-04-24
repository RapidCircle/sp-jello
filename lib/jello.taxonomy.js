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
