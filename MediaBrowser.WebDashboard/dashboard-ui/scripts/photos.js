﻿(function ($, document) {

    var view = LibraryBrowser.getDefaultItemsView('Poster', 'Poster');

    var data = {};
    function getQuery(tab) {

        var key = getSavedQueryKey(tab);
        var pageData = data[key];

        if (!pageData) {
            pageData = data[key] = {
                query: {
                    SortBy: "SortName",
                    SortOrder: "Ascending",
                    Fields: "PrimaryImageAspectRatio,SortName,SyncInfo",
                    ImageTypeLimit: 1,
                    EnableImageTypes: "Primary",
                    StartIndex: 0,
                    Limit: LibraryBrowser.getDefaultPageSize()
                }
            };
            setQueryPerTab(tab, pageData.query);
            pageData.query.ParentId = LibraryMenu.getTopParentId();
            LibraryBrowser.loadSavedQueryValues(key, pageData.query);
        }
        return pageData.query;
    }

    function getSavedQueryKey(tab) {

        return getWindowUrl() + "&tab=" + tab;
    }

    function reloadItems(page, tabIndex) {

        Dashboard.showLoadingMsg();

        var query = getQuery(tabIndex);

        ApiClient.getItems(Dashboard.getCurrentUserId(), query).done(function (result) {

            // Scroll back up so they can see the results from the beginning
            window.scrollTo(0, 0);

            var html = '';
            var pagingHtml = LibraryBrowser.getQueryPagingHtml({
                startIndex: query.StartIndex,
                limit: query.Limit,
                totalRecordCount: result.TotalRecordCount,
                viewButton: false,
                showLimit: false
            });

            page.querySelector('.listTopPaging').innerHTML = pagingHtml;

            if (view == "Poster") {
                // Poster
                html = LibraryBrowser.getPosterViewHtml({
                    items: result.Items,
                    shape: "square",
                    context: getParameterByName('context') || 'photos',
                    overlayText: true,
                    lazy: true,
                    coverImage: true,
                    useSecondaryItemsPage: true
                });
            }

            var elem = page.querySelector('.itemsContainer');
            elem.innerHTML = html + pagingHtml;
            ImageLoader.lazyChildren(elem);

            $('.btnNextPage', page).on('click', function () {
                query.StartIndex += query.Limit;
                reloadItems(page, tabIndex);
            });

            $('.btnPreviousPage', page).on('click', function () {
                query.StartIndex -= query.Limit;
                reloadItems(page, tabIndex);
            });

            LibraryBrowser.saveQueryValues(getSavedQueryKey(tabIndex), query);

            Dashboard.hideLoadingMsg();
        });
    }

    function setQueryPerTab(tab, query) {

        if (tab == 1) {
            query.Recursive = true;
            query.MediaTypes = 'Photo';
        }
        else if (tab == 2) {
            query.Recursive = true;
            query.MediaTypes = 'Video';
        }
        else if (tab == 0) {
            query.Recursive = false;
            query.MediaTypes = null;
        }

        query.ParentId = getParameterByName('parentId') || LibraryMenu.getTopParentId();
    }

    function startSlideshow(page, itemQuery, startItemId) {

        var userId = Dashboard.getCurrentUserId();

        var localQuery = $.extend({}, itemQuery);
        localQuery.StartIndex = 0;
        localQuery.Limit = null;
        localQuery.MediaTypes = "Photo";
        localQuery.Recursive = true;
        localQuery.Filters = "IsNotFolder";

        ApiClient.getItems(userId, localQuery).done(function (result) {

            showSlideshow(page, result.Items, startItemId);
        });
    }

    function showSlideshow(page, items, startItemId) {

        var screenWidth = $(window).width();
        var screenHeight = $(window).height();

        var slideshowItems = items.map(function (item) {

            var imgUrl = ApiClient.getScaledImageUrl(item.Id, {

                tag: item.ImageTags.Primary,
                type: 'Primary',
                maxWidth: screenWidth,
                maxHeight: screenHeight

            });

            return {
                title: item.Name,
                href: imgUrl
            };
        });

        var index = items.map(function (i) {
            return i.Id;

        }).indexOf(startItemId);

        if (index == -1) {
            index = 0;
        }

        Dashboard.loadSwipebox().done(function () {

            $.swipebox(slideshowItems, {
                initialIndexOnArray: index,
                hideBarsDelay: 30000
            });
        });
    }

    function onListItemClick(e) {

        var page = $(this).parents('.page')[0];
        var info = LibraryBrowser.getListItemInfo(this);

        if (info.mediaType == 'Photo') {
            var tab = page.querySelector('neon-animated-pages').selected;
            var query = getQuery(tab);

            Photos.startSlideshow(page, query, info.id);
            return false;
        }
    }

    function loadTab(page, index) {

        switch (index) {

            case 0:
                {
                    reloadItems(page.querySelector('.albumTabContent'), 0);
                }
                break;
            case 1:
                {
                    reloadItems(page.querySelector('.photoTabContent'), 1);
                }
                break;
            case 2:
                {
                    reloadItems(page.querySelector('.videoTabContent'), 2);
                }
                break;
            default:
                break;
        }
    }

    $(document).on('pageinitdepends', "#photosPage", function () {

        var page = this;

        var tabs = page.querySelector('paper-tabs');
        LibraryBrowser.configurePaperLibraryTabs(page, tabs, page.querySelector('neon-animated-pages'));

        $(tabs).on('iron-select', function () {
            var selected = this.selected;
            if (LibraryBrowser.navigateOnLibraryTabSelect()) {

                if (selected) {
                    Dashboard.navigate('photos.html?tab=' + selected + '&topParentId=' + LibraryMenu.getTopParentId());
                } else {
                    Dashboard.navigate('photos.html?topParentId=' + LibraryMenu.getTopParentId());
                }

            } else {
                page.querySelector('neon-animated-pages').selected = selected;
            }
        });

        $(page.querySelector('neon-animated-pages')).on('tabchange', function () {
            loadTab(page, parseInt(this.selected));
        });

        $(page).on('click', '.mediaItem', onListItemClick);

    });

    window.Photos = {
        startSlideshow: startSlideshow
    };

})(jQuery, document);