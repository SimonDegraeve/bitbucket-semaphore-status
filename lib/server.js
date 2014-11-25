'use strict';
// jshint -W124, -W106, -W101

/*
 * Dependencies
 */
import * as koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as render from 'koa-ejs';
import * as router from 'koa-router';
import * as request from 'co-request';
import * as chalk from 'chalk';
import {join} from 'path';
import {BitBucket, SemaphoreBadge} from './helper';


/*
 * Application
 */
var app = koa();
var port = (process.env.PORT) ? process.env.PORT : 8000;
render(app, {
  root: join(__dirname, '../views'),
  layout: false,
  viewExt: 'ejs',
  cache: true,
  debug: true
});


/*
 * Middlewares
 */
app.use(bodyParser());

var {BITBUCKET_USERNAME: bbUsername, BITBUCKET_PASSWORD: bbPassword} = process.env;
app.use(function*(next) {
  this.bitbucket = new BitBucket(bbUsername, bbPassword);
  yield next;
});

app.use(router(app));


/*
 * Routes
 */
app.get('/', function*() {
  yield this.render('index', {
    bbUsername: Boolean(bbUsername),
    bbPassword: Boolean(bbPassword),
    host: this.protocol + '://' + this.get('host'),
    isAuthenticated: yield this.bitbucket.isAuthenticated()
  });
});

app.post('/pull-request/:semaphoreProjectId/:semaphoreAuthToken', function*() {
  // Extract usefull values
  var pullRequest, pR = {}, sP = {};
  ({semaphoreProjectId: sP.projectId, semaphoreAuthToken: sP.authToken} = this.params);
  try {
    ({pullrequest_created: pullRequest} = this.request.body || {});
    ({id: pR.id,
      description: pR.description,
      source: {
        commit: {hash: pR.commitId},
        branch: {name: pR.branchName},
        repository: {full_name: pR.repoName}
      }
    } = pullRequest);
  } catch (error) {
    this.throw(400, 'Invalid Bitbucket hook data');
  }
  // If it doesn't already have Semaphore status at the start of the description, let's add it
  if (!pullRequest.description.contains('[![Semaphore Build Status')) {
    // Create Semaphore badge
    var badge = yield new SemaphoreBadge(sP.projectId, pR.branchName, pR.commitId, sP.authToken);
    pullRequest.description = `${badge}\r\n\r\n${pullRequest.description}`;
    // Post badge to BitBucket
    yield this.bitbucket.api(`/repositories/${pR.repoName}/pullrequests/${pR.id}`, 'PUT', pullRequest);
    this.status = 204;
  } else {
    this.status = 204;
  }
});


/*
 * Error handler
 */
app.on('error', function(error) {
  console.log(chalk.red(error.stack));
});


/*
 * Server
 */
var server = app.listen(port, function() {
  var host = server.address().address;
  console.log('Listening at http://%s:%s', host, port);
});
