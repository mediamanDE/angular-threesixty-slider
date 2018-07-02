'use strict';

/**
 * @ngdoc directive
 * @name reg.threeSixty:regThreesixty
 * @description
 * # regThreesixty
 */
angular.module('reg.threesixty', [])
  .directive('threesixty', ['$document', '$window', function ($document, $window) {
    return {
      template: '<div class="reg-threesixty"></div>',
      restrict: 'E',
      replace: true,
      scope: {
        images: '=',
        reverse: '=',
        animateAfterLoading: '=',
        speedMultiplier: '='
      },
      link: function (scope, element, attrs) {

        var img;
        var imgList = scope.images;
        var slicedFrames = 0;
        var currentFrame = 0;
        var endFrame;
        var ticker = 0;
        var totalFrames;
        var loadedImages;
        var frames = [];
        var ready = false;
        var dragging;
        var pointerEndPosX;
        var pointerStartPosX;
        var pointerDistance;
        var monitorStartTime = 0;
        var monitorInt = 0;
        var countOfLoadedImgInSets = [];
        var speedMultiplier = scope.speedMultiplier ? parseInt(scope.speedMultiplier) : 20;
        var ROTATION_EVENT = 'threesixty-animate';

        var adjustHeight = function () {
          if (loadedImages > 0) {
            var firstImg = frames[0][0].getElementsByTagName('img')[0];

            var h = firstImg.clientHeight;

            // Fix a ie11 bug, that sets the clientHeight occasionally to 1px
            h = h !== 1 ? h : firstImg.naturalHeight;

            element.css('height', h + 'px');
          }
        };

        angular.element($window).on('resize', adjustHeight);

        var imageReadyOfSet = function (setIndex) {
          if (typeof countOfLoadedImgInSets[setIndex] === 'undefined') {
            countOfLoadedImgInSets[setIndex] = 1;
          } else {
            countOfLoadedImgInSets[setIndex] ++;
          }

          if (countOfLoadedImgInSets[setIndex] === imgList[setIndex].length) {
            loadedImages++;
            if (loadedImages === totalFrames) {
              ready = true;
              // start
              endFrame = totalFrames;

              if (scope.animateAfterLoading) {
                refresh();
              }
            }
          }
        };

        var adjustImgContainerSize = function (childImg) {
          var parent = angular.element(childImg).parent();
          var imageW = childImg.naturalWidth;
          var elementW = element[0].offsetWidth || imageW;
          var h = childImg.naturalHeight * ( elementW / imageW );

          angular.element(parent).css('height', h + 'px');
        };

        var load360Images = function () {

          for (var i = 1; i < imgList.length; i++) {
            var imgContainer = angular.element('<div class="img-container-360 reg-threesixty-item"/>');
            var imgSet = Array.isArray(imgList[i]) ? imgList[i] : [imgList[i]];
            imgList[i] = imgSet;
            imgSet.map(function (imgSrc) {
              var img = new Image();

              img.onload = (function () {
                imageReadyOfSet(i, imgContainer);
                return function(){
                  adjustImgContainerSize(this);
                };
              })(i);

              img.src = imgSrc;
              imgContainer.append(img);
            });

            element.append(imgContainer);
            frames[i] = imgContainer;
          }
        };

        var firstImageReady = function () {
          // Remove previous images.
          element.find('img').remove();
          loadedImages++;
          var firstImage = frames[0];
          angular.element(firstImage).addClass('current');
          element.append(firstImage);
          element.removeClass('loading-first');
          adjustHeight();
          load360Images();
        };

        var initImages = function () {

          element.addClass('loading-first');

          frames = [];
          totalFrames = imgList.length;
          loadedImages = 0;

          if (totalFrames > 0) {
            var imgContainer = angular.element('<div class="img-container-360 reg-threesixty-item"/>');
            var imgSet = Array.isArray(imgList[0]) ? imgList[0] : [imgList[0]];
            var loadedImagesForSetZero = 0;

            imgSet.map(function (imgSrc) {
              var img = new Image();

              img.onload = function () {
                loadedImagesForSetZero ++;

                if (loadedImagesForSetZero === imgSet.length) {
                  adjustImgContainerSize(this);
                  firstImageReady();
                }
              };

              img.src = imgSrc;
              imgContainer.append(img);
            });

            frames.push(imgContainer);
          }

        };

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

        var hidePreviousFrame = function () {
          angular.element(frames[getNormalizedCurrentFrame()]).removeClass('current');
        };

        var showCurrentFrame = function () {
          angular.element(frames[getNormalizedCurrentFrame()]).addClass('current');
        };


        var render = function () {
          if (frames.length > 0 && currentFrame !== endFrame) {
            var frameEasing = endFrame < currentFrame ?
              Math.floor((endFrame - currentFrame) * 0.1) :
              Math.ceil((endFrame - currentFrame) * 0.1);
            hidePreviousFrame();
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
          event.preventDefault();
          pointerStartPosX = getPointerEvent(event).pageX;
          dragging = true;

          $document.on('touchmove mousemove', mousemove);
          $document.on('touchend mouseup', mouseup);
        }

        function trackPointer(event) {
          if (ready && dragging) {

            pointerEndPosX = getPointerEvent(event).pageX;
            if (monitorStartTime < new Date().getTime() - monitorInt) {
              var frameDiff = 0,
                direction = scope.reverse ? -1 : 1;

              pointerDistance = pointerEndPosX - pointerStartPosX;

              if (pointerDistance > 0) {
                frameDiff = Math.ceil((totalFrames - 1) * speedMultiplier * (pointerDistance / element[0].clientWidth));
              } else {
                frameDiff = Math.floor((totalFrames - 1) * speedMultiplier * (pointerDistance / element[0].clientWidth));
              }

              endFrame = currentFrame + (direction * frameDiff);

              refresh();
              monitorStartTime = new Date().getTime();
              pointerStartPosX = getPointerEvent(event).pageX;
            }
          }
        }

        function mouseup(event) {
          event.preventDefault();
          dragging = false;
          $document.off('touchmove mousemove', mousemove);
          $document.off('touchend mouseup', mouseup);
        }

        function mousemove(event) {
          event.preventDefault();
          trackPointer(event);
        }

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
