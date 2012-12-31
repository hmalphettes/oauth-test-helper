MOCHA_OPTS = --timeout 30000
REPORTER = spec
TEST_FILES = test/*.js
DUMP_OPTS = 
DUMP_TARGET_FILE = dump/dump.json
S3_STOIC=s3cmd -c ~/.s3cmd/.stoic
S3_NPM_REPO=s3://npm-repo

lint:
	@jshint lib/* test/* --config jshint-config.json

run-test:
	@LOG_ACCESS_TOKEN=1 node app &
	@open http://localhost:3000/access_token/new

test: lint
	rm -rf metadata || true
	@./node_modules/.bin/mocha \
		$(MOCHA_OPTS) \
		--reporter $(REPORTER) \
		$(TEST_FILES)

test-acceptance:
	$(MAKE) -k test TEST_GOOG=true MOCHA_OPTS="--timeout 30000"

test-ci:
	$(MAKE) -k test MOCHA_OPTS="$(MOCHA_OPTS) --watch --growl" REPORTER="min"

test-reports:
	[ -d "reports" ] && rm -rf reports/* || true
	mkdir -p reports
	$(MAKE) -k test REPORTER="xunit > reports/tests.xml"
	$(MAKE) -k test REPORTER="doc > reports/tests-doc.html"

lib-cov:
	[ -d "lib-cov" ] && rm -rf lib-cov || true
	$(BIN)/istanbul instrument --output lib-cov --no-compact --variable global.__coverage__ lib

test-cov: lib-cov
	mkdir -p reports
	@IMPORTERJS_COV=1 $(MAKE) test "REPORTER=mocha-istanbul" ISTANBUL_REPORTERS=text-summary,html,cobertura

install-local:
	@npm install
	@npm link ../mapperjs || true
	
clean:
	[ -d "lib-cov" ] && rm -rf lib-cov || true
	[ -d "reports" ] && rm -rf reports || true
	[ -d "html-report" ] && rm -rf html-report || true
	[ -d "build" ] && rm -rf build || true
	[ -d "metadata" ] && rm -rf metadata || true

package: clean
	@npm pack

deploy: package
	$(S3_STOIC) put *.tgz  $(S3_NPM_REPO)

.PHONY: test
