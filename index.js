var   _ = require('lodash')
  , req = require('superagent')
  , q   = require('q')
  , qs  = require('query-string')
;

module.exports = {

    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var credentials = dexter.provider('asana').credentials('access_token')
          , names       = step.input('filter_name').toArray()
          , id          = step.input('filter_workspace').first()
          , team        = step.input('filter_team').first()
          , archived    = step.input('filter_archived').first()
          , self        = this
          , query       = {}
        ;

        setIfExists(query, 'workspace', id);
        setIfExists(query, 'team', team);
        setIfExists(query, 'archived', archived);

        //normalize
        names = _.map(names, function(name) { return name.toLowerCase(); });

        query = '?'+qs.stringify(query);

        var request = req.get('https://app.asana.com/api/1.0/projects'+query)
                         .set('Authorization', 'Bearer '+credentials)
                         .type('json')
                     ;

        promisify(request, 'end', 'body.data')
           .then(function(projects) {
               if(names.length) 
                   self.complete( _.filter(projects, function(project) { return names.indexOf(project.name.toLowerCase()) !== -1; }) );
               else 
                   self.complete(projects);
           })
           .catch(this.fail.bind(this));
    }
};

function promisify(scope, call, path) {
    var deferred = q.defer(); 

    scope[call](function(err, result) {
        return err
          ? deferred.reject(err)
          : deferred.resolve(_.get(result, path))
        ;
    });

    return deferred.promise;
}

function setIfExists(obj, key, value) {
    if(value !== null & value !== undefined) {
        obj[key] = value;
    }
}
