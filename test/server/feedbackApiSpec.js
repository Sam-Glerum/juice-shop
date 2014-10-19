/*jslint node: true */

var frisby = require('frisby'),
    insecurity = require('../../lib/insecurity');

var API_URL = 'http://localhost:3000/api';

var authHeader = { 'Authorization': 'Bearer ' + insecurity.authorize() } ;

frisby.create('POST new feedback')
    .post(API_URL + '/Feedbacks', {
        comment: 'Perfect!',
        rating: 5
    })
    .expectStatus(200)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSONTypes('data', {
        id: Number,
        createdAt: String,
        updatedAt: String
    })
    .afterJSON(function(feedback) {
        frisby.create('GET existing feedback item by id')
            .addHeaders(authHeader)
            .get(API_URL + '/Feedbacks/' + feedback.data.id)
            .expectStatus(200)
            .afterJSON(function () {
                frisby.create('PUT update existing feedback')
                    .addHeaders(authHeader)
                    .put(API_URL + '/Feedbacks/' + feedback.data.id, {
                        rating: 2
                    })
                    .expectStatus(200)
                    .afterJSON(function () {
                        frisby.create('DELETE existing feedback')
                            .addHeaders(authHeader)
                            .delete(API_URL + '/Feedbacks/' + +feedback.data.id)
                            .expectStatus(200)
                            .toss();
                    }).toss();
            }).toss();
    }).toss();

frisby.create('GET all feedback')
    .get(API_URL + '/Feedbacks')
    .expectStatus(200)
    .toss();

frisby.create('GET existing feedback by id is forbidden via public API')
    .get(API_URL + '/Feedbacks/1')
    .expectStatus(401)
    .toss();

frisby.create('PUT update existing feedback is forbidden via public API')
    .put(API_URL + '/Feedbacks/1', {
        comment: "This sucks like nothing has ever sucked before",
        rating: 1
    })
    .expectStatus(401)
    .toss();

frisby.create('DELETE existing feedback is forbidden via public API')
    .delete(API_URL + '/Feedbacks/1')
    .expectStatus(401)
    .toss();

frisby.create('DELETE existing 5-start feedback')
    .delete(API_URL + '/Feedbacks/1')
    .addHeaders(authHeader)
    .expectStatus(200)
    .toss();

frisby.create('POST sanitizes unsafe HTML from comment')
    .post(API_URL + '/Feedbacks', {
        comment: 'I am a harm<script>steal-cookie</script><img src="csrf-attack"/><iframe src="evil-content"></iframe>less comment.',
        rating: 1
    })
    .expectStatus(200)
    .expectJSON('data', {
        comment: 'I am a harmless comment.'
    })
    .toss();

frisby.create('POST fails to sanitize masked CSRF-attack by not applying sanitization recursively')
    .post(API_URL + '/Feedbacks', {
        comment: 'The sanitize-html module up to at least version 1.4.2 has this issue: <<img src="csrf-attack"/>img src="csrf-attack"/>',
        rating: 1
    })
    .expectStatus(200)
    .expectJSON('data', {
        comment: 'The sanitize-html module up to at least version 1.4.2 has this issue: <img src="csrf-attack"/>'
    })
    .toss();

frisby.create('POST fails to sanitize masked XSS-attack by not applying sanitization recursively')
    .post(API_URL + '/Feedbacks', {
        comment: 'But basically its the fault htmlparser2 in version 3.3.0 which sanitize-html 1.4.2 depends on: <<script>alert("XSS3")</script>script>alert("XSS3")<</script>/script>',
        rating: 1
    })
    .expectStatus(200)
    .expectJSON('data', {
        comment: 'But basically its the fault htmlparser2 in version 3.3.0 which sanitize-html 1.4.2 depends on: <script>alert("XSS3")</script>'
    })
    .toss();

frisby.create('POST feedback in another users name as anonymous user')
    .post(API_URL + '/Feedbacks', {
        comment: 'Lousy crap!',
        rating: 1,
        UserId: 3
    }, {json: true})
    .expectStatus(200)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSON('data', {
        UserId: 3
    }).toss();

frisby.create('POST feedback in a non-existing users name as anonymous user')
    .post(API_URL + '/Feedbacks', {
        comment: 'When juice fails...',
        rating: 2,
        UserId: 4711
    }, {json: true})
    .expectStatus(200)
    .expectHeaderContains('content-type', 'application/json')
    .expectJSON('data', {
        UserId: 4711
    }).toss();
