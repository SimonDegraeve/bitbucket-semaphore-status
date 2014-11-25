'use strict';

/*
 * Dependencies
 */
import * as request from 'co-request';
import * as chalk from 'chalk';
import {parse} from 'url';


/*
 * Internals
 */
var _Error = function(status = 500, message) {
  var error = new Error(message);
  error.status = status;
  return error;
};

var _responseErrorHandler = function(response, message) {
  if (response.statusCode >= 400) {
    throw new _Error(
      response.statusCode,
      response.headers['content-type'].contains('application/json') ? response.body.error.message || response.body.error : message
    );
  }
  return response;
};

var _retryOnError = function*(fnToCall, interval = 500, maxTry = 5) {
  var iterator = 0;
  var loop = function*() {
    try {
      return yield fnToCall();
    } catch (error) {
      iterator++;
      interval += interval;
      console.log(`Try ${iterator}/${maxTry} ${chalk.yellow(error)}`);
      if (iterator !== maxTry) {
        yield (callback) => setTimeout(callback, interval);
        yield loop;
      } else {
        throw error;
      }
    }
  };
  return yield loop();
};


/*
 * BitBucket Class
 */
export class BitBucket {
  constructor(username, password) {
    this.endpoint = 'https://api.bitbucket.org/2.0';
    this.auth = {username, password};
  }

  api() {
    return function*(query = '/user', method = 'GET', json = true) {
      return _responseErrorHandler(
        yield request({url: this.endpoint + query, auth: this.auth, method, json}),
        'Invalid BitBucket request'
      );
    }.apply(this, arguments);
  }

  isAuthenticated() {
    return function*() {
      try {
        return (yield this.api()).statusCode === 200;
      } catch (error) {}
      return false;
    }.apply(this, arguments);
  }
}


/*
 * SemaphoreBadge Class
 */
export class SemaphoreBadge {
  constructor(projectId, branchName, commitId, authToken, badgeType = 'semaphore') {
    Object.assign(this, {
      endpoint: 'https://semaphoreapp.com/api/v1',
      auth: {auth_token: authToken},
      projectId, branchName, commitId, badgeType
    });

    return function*() {
      yield this.fetchBranchId();
      yield this.fetchBuildId();
      return this.getBadge();
    }.apply(this, arguments);
  }

  api() {
    return function*(query = '/projects', method = 'GET', json = true) {
      return _responseErrorHandler(
        yield request({url: this.endpoint + query, qs: this.auth, method, json}),
        'Invalid Semaphore request'
      );
    }.apply(this, arguments);
  }

  fetchBranches() {
    return function*() {
      return (yield this.api(`/projects/${this.projectId}/branches`)).body;
    }.apply(this, arguments);
  }

  fetchHistory() {
    return function*() {
      return this.history = (yield this.api(`/projects/${this.projectId}/${this.branchId}`)).body;
    }.apply(this, arguments);
  }

  fetchBranchId() {
    return function*() {
      return yield _retryOnError(function*() {
        this.branchId = ((yield this.fetchBranches()).filter(({name}) => name === this.branchName)[0] || {}).id
        if (typeof this.branchId === 'undefined') {
          throw new _Error(404, 'Semaphore branch not found');
        }
      }.bind(this));
    }.apply(this, arguments);
  }

  fetchBuildId() {
    return function*() {
      return yield _retryOnError(function*() {
        this.buildId = ((yield this.fetchHistory()).builds.filter(({commit}) => commit.id === this.commitId)[0] || {}).build_number;
        if (typeof this.buildId === 'undefined') {
          throw new _Error(404, 'Semaphore commit not found');
        }
      }.bind(this));
    }.apply(this, arguments);
  }

  getUrl() {
    var {href, search} = parse(this.history.branch_history_url);
    return `${href.substr(0, href.length - search.length)}`;
  }

  getBadgeUrl() {
    return `${this.getUrl()}/${this.badgeType === 'semaphore' ? 'badge.png' : 'shields_badge.svg'}`;
  }

  getBadge() {
    return `[![Semaphore Build Status](${this.getBadgeUrl()})](${this.history.branch_url}/builds/${this.buildId})`;
  }
}
