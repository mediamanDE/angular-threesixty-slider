'use strict';

/**
 * @ngdoc directive
 * @name reg.threeSixty:regThreesixty
 * @description
 * # regThreesixty
 */
angular.module('reg.threesixty', [])
  .directive('threesixty', ['$document', '$window', '$timeout', function ($document, $window, $timeout) {
    return {
      template: '<div class="reg-threesixty"></div>',
      restrict: 'E',
      replace: true,
      scope: {
        images: '=',
        reverse: '=',
        animateAfterLoading: '=',
        speedMultiplier: '=',
        requiredMovementXinit: '=',
        requiredMovementXcont: '=',
        triggerMultiplier: '=',
        scrollLock: '=',
        scrollSwipe: '='
      },
      link: function (scope, element, attrs) {

        var img;
        var imgList = scope.images;
        var slicedFrames = 0;
        var currentFrame = 0;
        var endFrame;
        var ticker = 0;
        var totalFrames;
        var loadedFrames;
        var frames = [];
        var ready = false;
        var dragging;
        var pointerEndPosX;
        var pointerStartPosX;
        var pointerEndPosY;
        var pointerStartPosY;
        var pointerDistance;
        var monitorStartTime = 0;
        var monitorInt = 0;
        var speedMultiplier = scope.speedMultiplier ? parseInt(scope.speedMultiplier) : 20;
        var ROTATION_EVENT = 'threesixty-animate';
        var body = document.body;
        var bodyClasses = body.classList;
        var initialDrag = true;
        var scrollY = 0;
        var scrolling = false;
        var scrollTimer;
        var layers = [];

        /**
         * whether swiping through slides should be possible while scrolling
         */
        var scrollSwipe = scope.scrollSwipe === undefined ? true : Boolean(scope.scrollSwipe);

        /**
         * required movement on the X axis to start swiping
         */
        var requiredMovementXinit = scope.requiredMovementXinit ? parseInt(scope.requiredMovementXinit) : 6;

        /**
         * required movement on the X axis to consider it a swipe (after initial swipe)
         */
        var requiredMovementXcont = scope.requiredMovementXcont ? parseInt(scope.requiredMovementXcont) : 2;

        /**
         * how much bigger movement on the X axis has to be than movement on the Y axis
         */
        var triggerMultiplier = scope.triggerMultiplier ? parseInt(scope.triggerMultiplier) : 3;

        var adjustHeight = function () {
          if (loadedFrames > 0) {
            element.css('height', (layers[0].offsetHeight || layers[0].naturalHeight) + 'px');
          }
        };

        angular.element($window).on('resize', adjustHeight);

        /**
         * set scrolling variable to false when scrolling ended
         */
        var scrollEnd = function () {
          scrolling = false;
        };

        /**
         * update scrolling position that is used to lock scrolling while swiping
         */
        var updateOffset = function () {
          if (!dragging || initialDrag) {
            scrollY = $window.scrollY;
            scrolling = true;

            if (scrollTimer) {
              $timeout.cancel(scrollTimer);
            }
            scrollTimer = $timeout(scrollEnd, 300);
          }
        };

        if (scope.scrollLock) {
          $document.on('touchmove scroll', updateOffset);
        }

        /**
         * Load the given image set
         * @param imgSrcSet
         * @param onSetLoadEvent
         * @returns {Array}
         */
        var loadImgSet = function (imgSrcSet, onSetLoadEvent) {
          var loadedImages = 0;
          var images = [];

          imgSrcSet.map(function (imgSrc) {
            var img = new Image();
            img.onload = function (ev) {
              loadedImages++;
              if (loadedImages === imgSrcSet.length) {
                onSetLoadEvent();
              }
            };
            img.src = imgSrc;
            images.push(img);
          });

          return images;
        };

        /**
         * Event called every time a frame/set is loaded
         */
        var imageSetReady = function () {
          loadedFrames++;
          if (loadedFrames === totalFrames) {
            ready = true;
            // start
            endFrame = totalFrames;

            if (scope.animateAfterLoading) {
              refresh();
            }
          }
        };

        /**
         * Activate the given image set
         * @param imgSet
         */
        var activateImgSet = function (imgSet) {
          imgSet.map(function (img, index) {
            var layerCanvas = layers[index];
            var ctx = layerCanvas.getContext('2d');

            ctx.mozImageSmoothingEnabled = false;
            ctx.webkitImageSmoothingEnabled = false;
            ctx.msImageSmoothingEnabled = false;
            ctx.imageSmoothingEnabled = false;

            layerCanvas.width = img.width;
            layerCanvas.height = img.height;
            ctx.drawImage(img, 0, 0);
          });
        };

        /**
         * Event called when the first image is ready
         */
        var firstImageReady = function () {
          // Remove previous images.
          element.find('img').remove();
          loadedFrames++;
          activateImgSet(frames[0]);
          element.removeClass('loading-first');
          $timeout(function () {
            adjustHeight();
          }, 50);
        };

        /**
         * Init the images
         */
        var initImages = function () {

          element.addClass('loading-first');

          frames = [];
          loadedFrames = 0;

          if (!Array.isArray(imgList[0])) {
            var newImgList = [];
            imgList.map(function (imgSrc) {
              newImgList.push([imgSrc]);
            });
            imgList = newImgList;
          }

          totalFrames = imgList.length;

          if (totalFrames <= 0) {
            return;
          }

          // Create canvas layers
          imgList[0].map(function () {
            var canvas = document.createElement('canvas');
            element.append(canvas);
            layers.push(canvas);
          });

          // Load first image set
          var firstImgSet = loadImgSet(imgList[0], firstImageReady);
          frames.push(firstImgSet);

          // Load the rest
          for (var i = 1; i < imgList.length; i++) {
            frames[i] = loadImgSet(imgList[i], imageSetReady);
          }
        };

        initImages();

        // Update images on model change
        // only if image list changes
        scope.$watchCollection('images', function (newImageList, oldImageList) {

          slicedFrames += Math.abs(getNormalizedCurrentFrame());
          if (slicedFrames >= newImageList.length - 1) {
            slicedFrames -= newImageList.length;
          }

          var firstPart = newImageList.slice(0, slicedFrames);
          var lastPart = newImageList.slice(slicedFrames);

          imgList = lastPart.concat(firstPart);
          currentFrame = 0;
          if (newImageList.length != oldImageList.length) {
            initImages();
          } else {
            for (var i = 0; i < oldImageList.length; i++) {
              if (newImageList[i] !== oldImageList[i]) {
                initImages();
                break;
              }
            }
          }

        });


        var refresh = function (animationSpeed) {

          if (ticker === 0) {
            ticker = setInterval(render, animationSpeed || Math.round(1000 / 30));
          }
        };

        var getNormalizedCurrentFrame = function () {
          var c = -Math.ceil(currentFrame % totalFrames);
          if (c < 0) {
            c += (totalFrames - 1);
          }
          return c;
        };

        var showCurrentFrame = function () {
          activateImgSet(frames[getNormalizedCurrentFrame()]);
          //frames[getNormalizedCurrentFrame()].className = 'current';
        };


        var render = function () {
          if (frames.length > 0 && currentFrame !== endFrame) {
            var frameEasing = endFrame < currentFrame ?
              Math.floor((endFrame - currentFrame) * 0.1) :
              Math.ceil((endFrame - currentFrame) * 0.1);
            // hidePreviousFrame();
            currentFrame += frameEasing;
            showCurrentFrame();
          } else {
            $window.clearInterval(ticker);
            ticker = 0;
          }
        };

        // Touch and Click events

        var getPointerEvent = function (event) {
          return event.targetTouches ? event.targetTouches[0] : event;
        };

        element.on('touchstart mousedown', mousedown);

        function mousedown(event) {
          pointerStartPosX = getPointerEvent(event).pageX;
          pointerStartPosY = getPointerEvent(event).pageY;
          dragging = true;

          element.on('touchmove mousemove', mousemove);
          element.on('touchend mouseup', mouseup);
        }

        function trackPointer(event) {
          if (ready && dragging && (!scope.scrollLock || !scrolling)) {

            var pointerEvent = getPointerEvent(event);

            pointerEndPosX = pointerEvent.pageX;
            pointerEndPosY = pointerEvent.pageY;

            if (monitorStartTime < new Date().getTime() - monitorInt) {
              var frameDiff = 0,
                direction = scope.reverse ? -1 : 1;

              pointerDistance = pointerEndPosX - pointerStartPosX;
              var xDistanceAbs = Math.abs(pointerDistance);
              var pointerDistanceY = Math.abs(pointerEndPosY - pointerStartPosY);

              if (((!initialDrag && xDistanceAbs >= requiredMovementXcont) ||
                  (initialDrag && xDistanceAbs >= requiredMovementXinit)) &&
                (pointerDistanceY * triggerMultiplier) < xDistanceAbs) {

                if (initialDrag) {
                  initialDrag = false;

                  if (scope.scrollLock) {
                    body.style.top = -Math.abs(scrollY) + 'px';
                    bodyClasses.add('no-scroll');
                  }
                }

                var rawDiff = (totalFrames - 1) * speedMultiplier * (pointerDistance / element[0].clientWidth);

                if (pointerDistance > 0) {
                  frameDiff = Math.ceil(rawDiff);
                } else {
                  frameDiff = Math.floor(rawDiff);
                }

                endFrame = currentFrame + (direction * frameDiff);

                refresh();
              } else if (!scrollSwipe && (initialDrag && xDistanceAbs * triggerMultiplier < pointerDistanceY)) {
                dragging = false;
              }

              monitorStartTime = new Date().getTime();
              pointerStartPosX = pointerEvent.pageX;
              pointerStartPosY = pointerEvent.pageY;
            }
          }
        }

        function mouseup(event) {
          element.off('touchmove mousemove', mousemove);
          element.off('touchend mouseup', mouseup);

          if (scope.scrollLock) {
            bodyClasses.remove('no-scroll');
            if (!initialDrag) {
              $window.scroll(0, Math.abs(parseInt(body.style.top)));
              body.style.top = null;
            }
          }

          dragging = false;
          initialDrag = true;
        }

        function mousemove(event) {
          event.stopPropagation();
          trackPointer(event);
        }

        scope.$on(ROTATION_EVENT, function (event, animationSpeed) {
          endFrame = currentFrame + totalFrames;
          refresh(animationSpeed);
        });

        scope.$on('$destroy', function () {
          $document.off('touchmove mousemove', mousemove);
          $document.off('touchend mouseup', mouseup);
          angular.element($window).off('resize', adjustHeight);
        });

      }
    };
  }]);
