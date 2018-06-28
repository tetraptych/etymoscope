rebuild:
	docker-compose build --no-cache

# Run the backend in debug mode.
flask-debug:
	docker-compose run --service-ports backend bash -c "python main.py"

backend-lint:
	docker-compose run --no-deps backend bash -c "flake8 ."
	docker-compose run --no-deps backend bash -c "pep257 --match-dir '[^\.*data]' ."

backend-test:
	docker-compose run --no-deps backend pytest -s tests

BACKEND_COVERAGE=pytest --cov=backend --cov-config .coveragerc --cov-fail-under=84 --cov-report term-missing
backend-coverage:
	docker-compose run --no-deps backend ${BACKEND_COVERAGE}

frontend-test:
	docker-compose run frontend bash -c "yarn test"

# Run tests for all components.
test:
	$(MAKE) backend-lint
	$(MAKE) backend-coverage
	$(MAKE) frontend-test

# [Dummy dependency to force a make command to always run.]
FORCE:
