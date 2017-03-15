angularAPP.controller('ViewTopicCtrl', function ($scope, $rootScope, $filter, $routeParams, $log, $mdToast, $location, $mdDialog, $http, KafkaRestProxyFactory, UtilsFactory, env) {

  $log.info("Starting kafka-topics controller : view ( topic = " + $routeParams.topicName + " )");
  $scope.topicName = $routeParams.topicName;
  $rootScope.topicName = $routeParams.topicName;

  $scope.topicCategoryUrl = $routeParams.topicCategoryUrl;
  $rootScope.topicCategoryUrl = $routeParams.topicCategoryUrl;
  $scope.$on('$routeChangeSuccess', function() {
    $scope.cluster = env.getSelectedCluster().NAME;//$routeParams.cluster;
  })
    $scope.maxHeight = window.innerHeight - 215;
    if ($scope.maxHeight < 310) {$scope.maxHeight = 310}

    if ($routeParams.selectedTabIndex == "topic") {
      $scope.selectedTabNnumber=0;
    }
    else if ($routeParams.selectedTabIndex == "table") {
      $scope.selectedTabNnumber=1;
    }
    else if ($routeParams.selectedTabIndex == "rawdata") {
      $scope.selectedTabNnumber=2;
    }
    else if ($routeParams.selectedTabIndex == "config") {
      $scope.selectedTabNnumber=3;
    }
    else {
      $scope.selectedTabNnumber=0;
    }

    $scope.onTabChanges = function(currentTabIndex){
        $location.path ("cluster/"+ $scope.cluster + "/topic/" +  $scope.topicCategoryUrl + "/" + $scope.topicName + "/" + currentTabIndex, false);
    };

  $scope.showSpinner = true;
  $scope.KAFKA_TOPIC_DELETE_COMMAND = TOPIC_CONFIG.KAFKA_TOPIC_DELETE_COMMAND;

  /************* UI-GRID **************/
  $scope.gridOptions = {
    enableSorting: true,
    enableColumnResizing: true,
    // rowHeight: 3,
    columnDefs: [
      {field: 'offset', maxWidth: 75, cellClass: 'grid-center', headerCellClass: 'grid-header-landoop'},
      {field: 'partition', maxWidth: 75, cellClass: 'grid-center', headerCellClass: 'grid-header-landoop-small'}
    ]
  };
  // *********** UI- GRID **********

  $scope.topicType = KafkaRestProxyFactory.getDataType($scope.topicName);

  $scope.editor;

  $scope.aceLoaded = function (_editor) {
    $scope.editor = _editor;
    $scope.editor.$blockScrolling = Infinity;
    _editor.setOptions({
      minLines: 33,
      maxLines: $scope.maxHeight / 15
    });

  };

  $scope.isSchemaLong = function (schema) {
    return ((schema != null) && (schema.length >= 42))
  };

  $scope.getData = function (topicName) {
    $log.info("Download requested for " + $scope.aceString.length + " bytes ");
    var json = $scope.aceString;
    var blob = new Blob([json], {type: "application/json;charset=utf-8;"});
    var downloadLink = angular.element('<a></a>');
    downloadLink.attr('href', window.URL.createObjectURL(blob));
    downloadLink.attr('download', topicName + '.json');
    downloadLink[0].click();
  };

  // DIALOG //////
  var originatorEv;

  $scope.openMenu = function ($mdOpenMenu, ev) {
    originatorEv = ev;
    $mdOpenMenu(ev);
  };

  $scope.notificationsEnabled = true;
  $scope.toggleNotifications = function () {
    $scope.notificationsEnabled = !$scope.notificationsEnabled;
  };

  $scope.streamFromBeginning = function () {
    var kbytesFromBeginning = $mdDialog.alert()
      .title('Stream from beginning of topic')
      .textContent('Will fetch 100 KBytes of data from topic')
      .targetEvent(originatorEv)
      .clickOutsideToClose(true)
      .ok('Okay!');

    $mdDialog.show(kbytesFromBeginning).then(function () {
      $log.info("Streaming from beginning");
      $scope.consumeKafkaRest($scope.topicType, $scope.topicName);
    });

    originatorEv = null;
  };

  $scope.getExtraConfig = function (topicName) {
    var topicDetails = KafkaRestProxyFactory.isNormalTopic(topicName) ? $rootScope.topicDetails : $rootScope.controlTopicDetails;
    var extra = KafkaRestProxyFactory.hasExtraConfig(topicName, topicDetails);
    if (extra)
    return JSON.parse(extra);
    else return ''
  };

  $scope.getDefaultConfigValue = function (configKey) {
    var defaultConfigValue = "";
    angular.forEach(KAFKA_DEFAULTS, function (kafkaDefault) {
      if (kafkaDefault.property == configKey) {
        defaultConfigValue = kafkaDefault.default;
      }
    });
    return defaultConfigValue;
  };

  $scope.getConfigDescription = function (configKey) {
    var configDescription = "";
    angular.forEach(KAFKA_DEFAULTS, function (kafkaDefault) {
      if (kafkaDefault.property == configKey) {
        configDescription = kafkaDefault.description;
      }
    });
    return configDescription;
  };

   $scope.showMoreDesc = [];
   $scope.ToggleMoreDesc = function (index) {
      $scope.showMoreDesc[index] = !$scope.showMoreDesc[index];
   };

  $scope.streamInRealTime = function () {
    $log.info("Streaming in real time");
    // This never happens.
  };
  ///////////////////////

  $log.debug("topicType=" + JSON.stringify($scope.topicType));
  // If value exists in an array
  function isInArray(value, array) {
    return array.indexOf(value) > -1;
  }

  function setCustomMessage(rows) {
    var totalRows = 0;
    if ($scope.topicName == "_schemas") {
      totalRows = rows.length;
      $scope.customMessage = "Topic <b>_schemas</b> holds <b>" + totalRows + "</b> registered schemas for the schema-registry"
    } else if ($scope.topicName == "connect-configs") {
      totalRows = rows.length;
      $scope.customMessage = "Topic <b>connect-configs</b> holds <b>" + $scope.getConnectors(rows, 'connector-').length + "</b> connector configurations" +
        " and <b>" + $scope.getConnectors(rows, 'task-').length + "</b> task configurations";
    } else if ($scope.topicName == "connect-offsets") {
      totalRows = rows.length;
      $scope.customMessage = "Topic <b>connect-offsets</b> holds the offsets of your connectors. Displaying <b>" + totalRows + "</b> rows";
    } else if ($scope.topicName == "connect-status") {
      totalRows = rows.length;
      // $scope.customMessage = "Topic <b>connect-status</b> holds <b>" + $scope.getCompactedConnectStatus(rows, 'RUNNING').length + "</b> RUNNING connectors";
      $scope.customMessage = "";
    } else {
      if (UtilsFactory.IsJsonString(rows)) {
        totalRows = JSON.parse(rows).length;
        $scope.customMessage = "Displaying " + totalRows + " rows ";// + KafkaRestProxyFactory.bytesToSize(rows.length);
      } else {
        totalRows = rows.length;
        $scope.customMessage = "Displaying " + totalRows + " rows ";// + KafkaRestProxyFactory.bytesToSize(rows.length);
      }
    }
    $scope.topicIsEmpty = totalRows == 0;

    return totalRows;
  }

  // text can be 'connector-' 'task-' 'commit-'
  $scope.getConnectors = function (rows, search) {
    var defaultValue = [];
    //$log.error(rows);
    if (rows != undefined) {
      angular.forEach(rows, function (row) {
        if (row.key.indexOf(search) == 0) {
          defaultValue.push(row);
        }
      });
    }
    return (defaultValue);
  };

  // Get the keys ..
  $scope.getTopicKeys = function (rows) {
    var allTopicKeys = ["key", "partition", "offset"];
    if (rows != undefined) {
      angular.forEach(angular.fromJson(rows), function (row) {
        // $log.info("data= " + JSON.stringify(row.value));
        if (JSON.stringify(row.value) != null && JSON.stringify(row.value).indexOf("{\\") == 0) {
          angular.forEach(JSON.parse(row.value), function (value, key) {
            //$log.info("Key-Value = " + key + " value=" + value);
            if (!isInArray(key, allTopicKeys)) {
              allTopicKeys.push(key);
            }
          });
        } else {
          // $log.info(" value=" + row.value);
          if (!isInArray("value", allTopicKeys)) {
            allTopicKeys.push("value");
          }
        }
        // TODO
      });
      // $log.info("Completeeeed " + JSON.stringify(rows).length);
      $scope.totalKeys = allTopicKeys.length;
    }
    // else {
    //   $log.debug("Undefined");
    // }
    return allTopicKeys;
  };

  $scope.getTopicValues = function (rows) {
    var allTopicValues = [];
    angular.forEach(angular.fromJson(rows), function (row) {
      // $log.debug(row + "    " + JSON.stringify(row.value));
      var x = {};
      x.key = row.key;
      x.partition = row.partition;
      x.offset = row.offset;
      if (JSON.stringify(row.value) != null && JSON.stringify(row.value).indexOf("{\"") == 0) {
        x.extraDataFlattened = [];
        // $log.error("Value is JSon->" + JSON.stringify(row.value));
        angular.forEach(row.value, function (peiler) {
          //$log.debug("peiler = " + peiler);
          x.extraDataFlattened.push(peiler);
        });
      } else {
        x.extraDataFlattened = [];
        // $log.info("Key= " + key + " value= " + value);
        if (row.value != undefined) {
          x.extraDataFlattened.push(row.value);
        }
      }
      allTopicValues.push(x);
    });
    // $log.debug("XXX " + JSON.stringify(allTopicValues));
    $scope.allTopicValues = allTopicValues;
    return allTopicValues;
  };

  $scope.getConnector = function (row) {
    if (row.value.length >= 5) {
      var data = JSON.parse(row.value).properties;
      var topics = "";
      if (data.topic != null) {
        topics = topics + data.topic;
      } else if (data.topics != null) {
        topics = topics + data.topics;
      }
      // TODO: This run's 10ns of times ! $log.error(data);
      var connectorData = {
        name: data.name,
        topic: topics,
        tasksmax: data['tasks.max'],
        file: data.file,
        class: data['connector.class']
      };
      return connectorData;
    }
  };

  $scope.getTask = function (row) {
    var data = JSON.parse(row.value).properties;
    var topics = "";
    if (data.topic != null) {
      topics = topics + data.topic;
    } else if (data.topics != null) {
      topics = topics + data.topics;
    }
    // TODO: This run's 10ns of times ! $log.error(data);
    var taskData = {
      topic: topics,
      file: data.file,
      class: data['task.class']
    };
    return taskData;
  };

  $scope.getCommit = function (row) {
    var data = JSON.parse(row.value);
    // TODO: This run's 10ns of times ! $log.error(data);
    var commitData = {
      tasks: data.tasks
    };
    return commitData;
  };

  $scope.isNormalTopic = function (topicName) {
    return ['_schemas', 'connect-status'].indexOf(topicName) == -1;
  };

  $scope.isControlTopic = function(topicName) {
     return !KafkaRestProxyFactory.isNormalTopic(topicName);
  };

  // At start-up this controller consumes data
  var start = new Date().getTime();
  if (($scope.topicType == "json") || ($scope.topicType == "binary") || ($scope.topicType == "avro")) {
    var dataPromise = KafkaRestProxyFactory.consumeKafkaRest($scope.topicType, $scope.topicName);
    dataPromise.then(function (allData) {
      var end = new Date().getTime();
      $log.info("[" + (end - start) + "] msec - to get " + angular.fromJson(allData).length + " " + $scope.topicType + " rows from topic " + $scope.topicName); //  + JSON.stringify(allSchemas)

      $scope.aceString = angular.toJson(allData, true);
      $scope.rows = allData;
      setCustomMessage($scope.rows);
      flattenTable(allData);
      $scope.getTopicValues($scope.rows);

      end = new Date().getTime();
      $log.info("[" + (end - start) + "] msec - to get & render"); //  + JSON.stringify(allSchemas)
      $scope.showSpinner = false;
    }, function (reason) {
      $log.error('Failed: ' + reason);
    }, function (update) {
      $log.info('Got notification: ' + update);
    });
  } else {
    $log.warn("We don't really know the data type of topic" + $scope.topicName + " so we will attempt all options..");
    // If we don't know we need to guess by trying Avro -> JSon -> Binary
    var dataPromiseAvro = KafkaRestProxyFactory.consumeKafkaRest("avro", $scope.topicName);
    dataPromiseAvro.then(function (allData) {
      if (allData.error_code > 0) {
        $log.warn('Failed with Avro - going to try with Json this time (', allData, ')');
        var dataPromiseAvro = KafkaRestProxyFactory.consumeKafkaRest("json", $scope.topicName);
        dataPromiseAvro.then(
          function (allData) {
            if (allData.error_code > 0) {
              $log.warn('Failed with JSon as well - going to try with Binary this time (', allData, ')');
              var dataPromiseAvro = KafkaRestProxyFactory.consumeKafkaRest("binary", $scope.topicName);
              dataPromiseAvro.then(function (allData) {
                $log.info("Binary detected");
                var end = new Date().getTime();
                $scope.topicType = "binary";
                $scope.aceString = angular.toJson(allData, true);
                $scope.rows = allData;
                setCustomMessage($scope.rows);
                flattenTable(allData);
                angular.fromJson($scope.rows);
                $scope.getTopicValues($scope.rows);
                $log.info("[" + (end - start) + "] msec - to get " + angular.fromJson(allData).length + " " + $scope.topicType + " rows from topic " + $scope.topicName); //  + JSON.stringify(allSchemas)
                $scope.showSpinner = false;
              }, function (reason) {
                $log.error('Failed with Binary as well ?! :(  (' + reason + ')');
              });
            } else {
              $log.info("JSon detected");
              var end = new Date().getTime();
              $scope.topicType = "json";
              $scope.aceString = allData;
              $scope.rows = allData;
              setCustomMessage($scope.rows);
              flattenTable(allData);
              $scope.getTopicValues($scope.rows);
              $log.info("[" + (end - start) + "] msec - to get " + angular.fromJson(allData).length + " " + $scope.topicType + " rows from topic " + $scope.topicName); //  + JSON.stringify(allSchemas)
              $scope.showSpinner = false;
            }
          }, function (reason) {
          });
      } else {
        // $log.info("Avro detected" + allData);
        var end = new Date().getTime();
        $scope.topicType = "avro";
        $scope.aceString = angular.toJson(allData, true);
        $scope.rows = allData;
        setCustomMessage($scope.rows);
        flattenTable(allData);
        $scope.getTopicValues($scope.rows);
        $log.info("[" + (end - start) + "] msec - to get " + angular.fromJson(allData).length + " " + $scope.topicType + " rows from topic " + $scope.topicName); //  + JSON.stringify(allSchemas)
        $scope.showSpinner = false;
      }
    }, function (reason) {
    });
  }

  //tODO
  $scope.myTopic = $filter('filter')($rootScope.topicsCache, {name: $scope.topicName}, true);

  ///////////////////////////////////////////
  $mdToast.hide();
  $scope.kafkaDefaults = KAFKA_DEFAULTS; //TODO
  $scope.topicsOn = true;
  $scope.zookeeperInfo = "zookeeper.landoop.com.info.goes.here";
  //$scope.brokers = env.BROKERS();

  $scope.changeView = function () {
    $scope.topicsOn = !$scope.topicsOn;
  };

  // 1. Create a consumer for Avro data, starting at the beginning of the topic's log.
  // 2. Then consume some data from a topic, which is decoded, translated to JSON, and included in the response.
  // The schema used for deserialization is fetched automatically from the schema registry.
  // 3. Finally, clean up.
  // [ avro | json | binary ]
  $scope.consumeKafkaRest = function (messagetype, topicName) {
    $scope.showSpinner = true;
    var dataPromise = KafkaRestProxyFactory.consumeKafkaRest(messagetype, topicName);
    dataPromise.then(function (data) {
        $scope.aceString = data;
        $scope.rows = data;
        $scope.showSpinner = false;
        setCustomMessage($scope.rows);
        flattenTable(data);
        $scope.getTopicValues($scope.rows);
      }, function (reason) {
        $log.error('Failed: ' + reason);
      }, function (update) {
        $log.info('Got notification: ' + update);
      }
    );
  };

  // TOPICS
  $rootScope.selectedTopic;
  $scope.selectTopic = function (topicObj) {
    $rootScope.selectedTopic = topicObj
  };

  $scope.getLeader = function (partitions) {
    if (partitions.length > 0) return partitions[0];
  };

  $scope.getTailPartitions = function (partitions) {
    return partitions.slice(1);
  };

  $scope.getKafkaDefaultValue = function (key) {
    var defaultValue;
    angular.forEach(KAFKA_DEFAULTS, function (item) {
      if (item.property == key) {
        defaultValue = item.default;
      }
    });
    return defaultValue;
  };

  $scope.getKafkaDefaultDescription = function (key) {
    var defaultValue;
    angular.forEach(KAFKA_DEFAULTS, function (item) {
      if (item.property == key) {
        defaultValue = item.description;
      }
    });
    return defaultValue;
  };

  // BROKERS
  $scope.selectedBroker;
  $scope.selectBroker = function (brokerObj) {
    $scope.selectedBroker = brokerObj
  };


  /**
   * TODO: Move to utils
   */

  // This one is called each time - the user clicks on an md-table header (applies sorting)
  $scope.logOrder = function (a) {
    $log.info("Ordering event " + a);
    sortSchema(a);
  };

  function sortSchema(type) {
    var reverse = 1;
    if (type.indexOf('-') == 0) {
      // remove the - symbol
      type = type.substring(1, type.length);
      reverse = -1;
    }
    // $log.info(type + " " + reverse);
    $scope.rows = UtilsFactory.sortByKey($scope.rows, type, reverse);
  }

   //TODO move to service
    var flattenObject = function(ob) {
    	var toReturn = {};
    	for (var i in ob) {
    		if (!ob.hasOwnProperty(i)) continue;

    		if ((typeof ob[i]) == 'object') {
    			var flatObject = flattenObject(ob[i]);

    			for (var x in flatObject) {
    				if (!flatObject.hasOwnProperty(x)) continue;
    				toReturn[x] = flatObject[x];
    				}

    		} else {
    			toReturn[i] = ob[i];
    		}
    	}
    	return toReturn;
    };

 function flattenTable(rows) {

        var extraColumnsNumberValue = 0;
        var extraColumnsNumberKey = 0;
        var rowWithMoreColumns;
        $scope.flatRows = [];
        if (rows.length > 0) {
            angular.forEach(rows, function (row) {
                  if (row.key == undefined || row.key == null) row.key = '';
                  if (row.value == undefined || row.value == null) row.value = '';

                  if((angular.isNumber(row.value) || angular.isString(row.value)) && (angular.isNumber(row.key) || angular.isString(row.key))) {
                        extraColumnsNumberValue = 0
                        extraColumnsNumberKey = 0
                        var newRow = {
                            "offset" : row.offset,
                            "partition" : row.partition,
                            "key" : row.key,
                            "value" : row.value
                        }
                        $scope.cols = Object.keys(flattenObject(newRow));
                        $scope.cols2 = [];
                        $scope.cols3 = [];
                  } else {
                        var flatValue = flattenObject(row.value);
                        var flatKey = flattenObject(row.key);
                        var rowExtraColumnsValues = (!(angular.isNumber(row.value) || angular.isString(row.value))) ? Object.keys(flatValue).length : 0;
                        var rowExtraColumnsKeys = (!(angular.isNumber(row.key) || angular.isString(row.key))) ? Object.keys(flatKey).length : 0;

                        if(extraColumnsNumberValue < rowExtraColumnsValues) {
                            extraColumnsNumberValue = rowExtraColumnsValues;
                            rowWithMoreColumns = row;
                        }

                        if(extraColumnsNumberKey < rowExtraColumnsKeys) {
                            extraColumnsNumberKey = rowExtraColumnsKeys;
                            rowWithMoreColumns = row;
                        }

                        var newRow = {
                            "offset" : rowWithMoreColumns.offset,
                            "partition" : rowWithMoreColumns.partition,
                            "key" : rowWithMoreColumns.key,
                            "value" : rowWithMoreColumns.value
                        }

                        $scope.cols =  Object.keys(flattenObject(newRow));
                        if (!(angular.isNumber(row.value) || angular.isString(row.value))){
                          $scope.cols2 = Object.keys(flattenObject(newRow.value));
                        }
                        else {
                          $scope.cols2 = []
                        }
                        if (!(angular.isNumber(row.key) || angular.isString(row.key))){
                          $scope.cols3 = Object.keys(flattenObject(newRow.key));
                        }
                        else {
                          $scope.cols3 = [];
                        }

                  }

                  $scope.flatRows.push(flattenObject(row));


                });

                          $scope.gridOptions.columnDefs.push({field: $scope.cols3.toString(), headerCellClass: 'grid-header-landoop'})
                          console.log(typeof($scope.cols3))

                          angular.forEach($scope.cols2, function(value) {
                             $scope.gridOptions.columnDefs.push({field: value.toString(), headerCellClass: 'grid-header-landoop'})
                          })
                          $scope.gridOptions.data = $scope.flatRows; //TODO removeme

                $scope.extraColsNumValues = extraColumnsNumberValue;
                $scope.extraColsNumKeys = extraColumnsNumberKey;

         var itemsPerPage = (window.innerHeight - 360) / 31
         Math.floor(itemsPerPage) < 10 ? $scope.fittingItems =10 : $scope.fittingItems = Math.floor(itemsPerPage);
//         $scope.paginationChanged = function(num) {
//         console.log('test')
//           if (isNaN(parseInt(num))) {
//            $scope.paginationItems = $scope.fittingItems;
//           } else if (num == 0) {
//            $scope.paginationItems = $scope.fittingItems
//           }
//            else {
//            $scope.paginationItems = num
//            }
//         }

         $scope.paginationItems = $scope.fittingItems;
         $scope.showHideAllButtonLabel = 'show ' + rows.length;
     }
}

 $scope.showTree = function (keyOrValue) {
    return !(angular.isNumber(keyOrValue) || angular.isString(keyOrValue) || (keyOrValue==null));
 }


});
