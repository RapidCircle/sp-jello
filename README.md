# Jello for Sharepoint Lists

Jello is built to consume Sharepoint REST API for list manipulation. I try my best to keep each and every release clean by shipping few but robust features. You are still bound to notice a few issues or limitations. Please use the github issue list to add any issues or features you would like to have in Jello.

## Why use Jello?

Jello is designed to make developing on Sharepoint lists using REST API fun. It is attempt to help developers build apps (esp. single page applications) that work with Sharepoint lists focus on business logic.

Top features

- Automated call for X-RequestDigest
- Method chaining for list queries
- Easily page through list query results (paging support)

## Getting started

Jello is easy to use. With the first few releases we are focusing on REST API with Sharepoint lists only. Jello has a dependency on `jQuery`. Make sure you have jQuery loaded in your page before starting to consume Jello.

### Get it from NPM

`npm install sp-jello`

_PS: note that if you are using Jello from NPM then you do not need to include jquery as Jello has a listed dependency to it._

### Initialize on a site

To initialize Jello on a Sharepoint site, you need to provide the `siteUrl`. The returned Jello object can then be used to perform operations on the web, list, list items etc.

```javascript
var Jello = new Jello("https://contoso.sharepoint/sites/mysubsite");
```

### Require it

```javascript
const JelloLib = require('sp-jello');
var Jello = new JelloLib("https://contoso.sharepoint/sites/mysubsite");
```

# Perform operations on list items.

To perform operations on list items you need to provide the list name and list options. The returned Jello object can then be used to perform operations on list items.

```javascript
var TaskList = Jello.ListItems({
    name: "TaskList",
    contentType: "SP.Data.TaskListListItem"
});
```

## Get list items `Jello.ListItems.get`

### accepts

`top`: `optional` If top is passed, those number of results will be queried from list. Uses `$top`.

### returns

jQuery promise object.

```javascript
TaskList.get().then(function (resp) {
    console.log("List results", resp);
}, function (err) {
    console.error("Failed because", err);
});

// Gets 500 items
TaskList.get(500).then(function(items){
    console.log("Items", items);
},
function (err) {
    console.log("Error fetching items", err);
});
```

## Get list item `Jello.ListItems.getById`

### accepts

`ID`: If item's `ID` is provided `get` will return a single list item.

### returns

jQuery promise object.

```javascript
TaskList.getById(12).then(function(item){
    console.log("Item", item);
},
function (err) {
    console.log("Error fetching item", err);
});
```

## Create list item `Jello.ListItems.add`

### accepts

`item`: Object denoting list item to be added

### returns

jQuery promise object.

```javascript
TaskList.add({
    Title: "Get eggs",
    Status: false
}).done(function (resp) {
    console.log("Added", resp);
}).fail(function (err) {
    console.log("Failed because", err);
});
```

## Update list item `Jello.ListItems.update`

### accepts

`ID`: List item ID `item`: Object carrying properties that need to be updated along with their desired values `etag`: `optional` Provides a way to verify that the object being changed has not been changed since it was last retrieved. If not provided, item properties will be overwritten.

### returns

jQuery promise object.

```javascript
TaskList.update(12, {
    Title: "Get 8 eggs"
}).then(function(){
    console.log("Successfully updated");
},
function(err) {
    console.log("Err updating", err);
});
```

## Delete list item `Jello.ListItems.remove`

### accepts

`ID`: List item ID `etag`: `optional` Provides a way to verify that the object being changed has not been changed since it was last retrieved.

### returns

jQuery promise object.

```javascript
TaskList.remove(12).then(function(){
    console.log("Successfully deleted");
},
function(err) {
    console.log("Err deleting", err);
});
```

## Query list items `Jello.ListItems.query`

### accepts

`filter`: OData filter string

### returns

jQuery promise object.

```javascript
TaskList.query("$filter=Status eq 1&$top=500").then(function(results){
    console.log("Query results", results);
},
function(err) {
    console.log("Err querying", err);
});
```

## Method chaining

Adopting a developer friendly pattern to make list queries. From Jello 0.3 method chaining is supported.

```javascript
TaskList.expand('AssignedTo/Title')
    .select("Title,Status,AssignedToId,AssignedTo/Title")
    .where("Status eq 0").get(4)
    .then(function(res){
    console.log("Method chain result", res);
}, function (err) {
    console.log("Error method chain", err);
});
```

`Jello.get` executes the constructed query. The `top` parameter can be passed to specific the number of items desired.

### Supported methods

- `Jello.where` appends `$filter`
- `Jello.select` appends `$select`
- `Jello.orderBy` appends `$orderby`
- `Jello.expand` appends `$expand`

For OData query reference, check <https://msdn.microsoft.com/en-us/library/office/fp142385.aspx>

# Perform Operations On The Term Store

To perform Operations on the term store you need to provide the terms store name as an initialization parameter for `Jello.Taxonomy`. The returned Jello object can then be used to perform further operations on the term store.

```javascript
var Taxonomy = Jello.Taxonomy({
    TermStore: "Taxonomy_14JlqlrzpVZ5lhPOPq0MnA=="
});
`
```

#### Note

Ensure that `SP.Taxonomy.js` is loaded before initializing `Jello.Taxonomy`

## Get all terms `Jello.Taxonomy.getAllTerms`

### accepts

The `GUID` of the term set to fetch all terms from

### returns

An enumerable object of the terms. Below is an example of how you can read the returned terms.

```javascript
Taxonomy.getAllTerms("58d946c1-d127-42d6-9c90-4ff1ca36a206")
    .done(function(terms) {
        var termEnumerator = terms.getEnumerator();
        while(termEnumerator.moveNext()){    
            var currentTerm = termEnumerator.get_current();
            //Do more with the currentTerm
          }

    }).fail(function(err) {
        console.error(err);
    });
```

## Create a new group in the term strore `Jello.Taxonomy.addTermGroup`

### accepts

`Name` represents the name of the group. The `GUID` represents the GUID of the term group to set.

### returns
The newly created group.

```javascript
Taxonomy.addTermGroup({
        Name: "New group",
        GUID: "3927987b-2633-4bca-965e-48852700a623"
    })
    .done(function(data) {
        console.log(data);
    }).fail(function(err) {
        console.error(err);
    });

```

## Add term set to a term group `Jello.Taxonomy.addTermSet`

### accepts
`GroupGUID` : The GUID of the group to which the term set needs to be added. `TermSetName` : The name of the term set. `TermSetGUID` : The GUID to associate with the newly created term set. `TermSetLCID` : the LCID of the term set (eg. 1033, 1043)

### returns
The newly created term set.

```javascript
Taxonomy.addTermSet({
        GroupGUID: "3927987b-2633-4bca-965e-48852700a623",
        TermSetName: "New Term Set",
        TermSetGUID: "e896bb20-acac-4f30-8dc5-838467362776",
        TermSetLCID: 1033
    })
    .done(function(data) {
        console.log(data);
    })
    .fail(function (err) {
      console.error(err)
    })
  ```

## Add term to a term set `Jello.Taxonomy.addTerm`
### accepts
`TermSetGUID` : The GUID of the term set to which the term needs to be added. `TermName` : The name of the term. `TermGUID` : The GUID to associate with the term. `TermLCID` : The LCID of the term.
### returns
```javascript
Taxonomy.addTerm({
        TermSetGUID: "e896bb20-acac-4f30-8dc5-838467362776",
        TermName: "New Term",
        TermGUID: "1deb5f7c-59d3-41b3-9a2e-b0e07446494e",
        TermLCID: 1033
    })
    .done(function(data) {
        console.log("All Done");
    })
    .fail(function (err) {
      console.error(err)
    });
```

# Perform Operations On Web
To perform operations on the web you need to provide the site to `Jello.Web`. The returned object can then be used to perform further operations on the web.

```javascript
var JelloWeb = Jello.Web({site: "https://contoso.sharepoint.com/sites/mysite"})
```

## Add a subsite
### accepts

`siteUrl` : The url of the subsite. `siteName` : The name of subsite `siteDescription` : The description for the subsite. `siteTemplate` : The template to use. For example `sts`. `Language` : The language to use for the subsite. Refer to `Jello.Constants` for a list of possible languages. `uniquePermissions` : A boolean representing if the site uses unique permissions.

### returns
jQuery promise object

```javascript
JelloWeb.add({
  siteUrl: "mysite",
  siteName: "My Site's Name",
  siteDescription: "This is the description that explains how to use this site.",
  siteTemplate: "sts",
  Language : Jello.Constants.Language.English,
  uniquePermissions: false
}).then(
  function(resp){
      console.log(resp)
  },
  function(err){
    console.error(err)
})
```

# Perform Operations On Lists
To perform operations on the list you need to provide the site to `Jello.List`. The returned object can then be used to perform further operations on the list.
```javascript
var JelloList = Jello.List({site: "https://contoso.sharepoint.com/sites/mysite"})
```
## Add a list
### accepts
`AllowContentTypes` : A boolean value to indicate if content types are allowed on the list. `BaseTemplate` : The template to use to create this list. For a list of possible values refer to `Jello.Constatns.Lists`. `ContentTypesEnabled`: A boolean to indicate if content type management is enabled. `Description` : The description of the list. `Title` : The title of the list.

### returns
jQuery promise object

```javascript
JelloList.add({
  AllowContentTypes : true,
  BaseTemplate : Jello.Constants.List.Template.Tasks,
  ContentTypesEnabled: true,
  Description : "This is the description",
  Title : "My Task List"
}).then(
  function(resp){
    console.log(resp)
  },
  function(err){
    console.error(err)
})
```
#### Note
This code is available to you as is without any warranties. It can do wonders, or shatter your dreams to pieces. The developers take no liability.
