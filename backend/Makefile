build-GoProducerFunction:
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o $(ARTIFACTS_DIR)/bootstrap ./src/producer

build-GoWorkerFunction:
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o $(ARTIFACTS_DIR)/bootstrap ./src/worker

build-GoApiFunction:
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o $(ARTIFACTS_DIR)/bootstrap ./src/api