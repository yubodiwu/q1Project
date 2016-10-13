'use strict';

window.onload = function() {
    var groupOnData = JSON.parse(localStorage.getItem('groupOnData'));
    var address = JSON.parse(localStorage.getItem('inputAddress'));
    var dealsContainer = $('#deals-container');
    var dropdown = $('#dropdown1');
    var modalSection = $('#modals-section');
    var allDealsButton = $('#all-deals');

    var cards = new GroupOnCards(groupOnData, address);

    cards.createDropdown(dropdown);
    cards.createHorizontalCards(dealsContainer, modalSection);
    cards.allDeals(allDealsButton);

    $(`.modal-trigger`).leanModal();

    $(document).on('click', '.modal-trigger', function() {
        var uuid = this.getAttribute('href').slice(1);
        var modalMap = document.getElementById(`map\&${uuid}`);
        var curCoord;
        $(modalMap).css('height', '400px');
        $(modalMap).css('width', '100%');
        // var test = document.createElement('p');
        console.log(modalMap);

        for (let card of cards.data) {
            if (card.uuid === uuid) {
                curCoord = {
                    lat: card.lat,
                    lng: card.lng
                };
            }
        }

        initMap(curCoord, address, modalMap);
    });
};

// class of cards for the GroupOn deals for the deals page
class GroupOnCards {
    constructor(groupOnData, address) {
        this.address = address;
        this.data = groupOnData;
        this.coord = {
            lat: address.geometry.location.lat,
            lng: address.geometry.location.lng
        };
        this.tags = [];
        for (let deal of this.data) {
            for (let tag of deal.tags) {
                if (this.tags.indexOf(tag.name) === -1) {
                    this.tags.push(tag.name);
                }
            }
        }
        this.tags.sort();
    }

    createHorizontalCards(dealsContainer, modalSection) {
        var dealCards = [];

        for (let deal of this.data) {
            if (deal.display === true) {
                var coordDeal = {
                    lat: deal.lat,
                    lng: deal.lng
                };
                var dist = Math.round(this._earthDistance(this.coord, coordDeal) * 100) / 100;

                var row = $('<div class="col s6" style="margin-top: 10px; margin-bottom: 10px">');
                var cardHorizontal = $('<div class="card">');
                var cardImg = $(`<div class="card-image">`).append($(`<img src=${deal.grid4ImageUrl} style="vertical-align: center;">`));
                var cardStacked = $('<div class="card-stacked">');
                var cardContent = $('<span class="card-content">');
                var cardText = $('<p style="margin: 10px">').text(deal.title);
                var cardAddressUpper = $('<p style="margin: 10px; margin-bottom: 0px">').text(`${deal.streetAddress}`);
                var cardAddressLower = $('<p style="margin: 10px; margin-top: 0px">').text(`${deal.city}, ${deal.state} ${deal.postalCode}`);
                var cardTitle = $('<h5 style="margin: 10px">').text(deal.announcementTitle);
                var cardAction = $('<div class="card-action">');
                var buyLink = $(`<a href=${deal.buyUrl}>`).text(`BUY \$${deal.priceAmount/100} (${deal.discountPercent}\% OFF)`);

                var cardDist = $(`<a class="modal-trigger" href="#${deal.uuid}">`).text(`MAP (${dist} MILES AWAY)`);

                // var cardCopyright = $('<p style="float: right;">').text('powered by GroupOn');

                this._addModalMap(coordDeal, cardDist, modalSection, this.coord);

                cardAction.append(buyLink);
                cardAction.append(cardDist);
                cardContent.append(cardTitle);
                cardContent.append(cardText);
                cardContent.append(cardAddressUpper);
                cardContent.append(cardAddressLower);
                cardContent.append(cardAction);
                // cardContent.append(cardCopyright);
                cardStacked.append(cardContent);

                cardHorizontal.append(cardImg);
                cardHorizontal.append(cardStacked);
                row.append(cardHorizontal);

                // create array of objects with the card, distance from the original address, and the price, then poplate an array with them
                var dealCard = {
                    card: row,
                    dist: dist,
                    price: deal.priceAmount
                };
                dealCards.push(dealCard);
            }
        }

        this._appendOrderedCards(dealsContainer, dealCards);
    }

    allDeals(button) {
        button.on('click', (event) => {
            for (let deal of this.data) {
                deal.display = true;
            }

            localStorage.setItem('groupOnData',JSON.stringify(this.data));
            window.location.href = 'deals.html';
        });
    }

    _appendOrderedCards(dealsContainer, dealCards) {
        // sort the array of cards by distance
        dealCards.sort(_compareDist);

        // attach the cards to the page with the closest entries by distance coming first
        for (let card of dealCards) {
            dealsContainer.append(card.card);
        }

        function _compareDist(deal1, deal2) {
            return deal1.dist - deal2.dist;
        }
    }

    // add modal map to card's distance anchor
    _addModalMap(coordDeal, cardDist, modalSection, address) {
        // var directionsRequest = {
        //     origin: new google.maps.LatLng(coordDeal.lat, coordDeal.lng),
        //     destination: new google.maps.LatLng(address.lat, address.lng),
        //     travelMode: 'DRIVING'
        // }
        var uuid = cardDist.attr('href');
        var modal = $(`<div id="${uuid.slice(1)}" class="modal">`);
        var modalContent = $(`<div class="modal-content">`);
        // var modalHeader = // need header
        var modalMap = $(`<div id="map\&${uuid.slice(1)}">`);

        modalContent.append(modalMap);
        modal.append(modalContent);

        modalSection.append(modal);
    }

    // create dropdown menu of restaurant types/offerings that can be clicked to filter for that kind of restaurant/offering
    createDropdown(dropdown) {
        for (let tag of this.tags) {
            let li = $('<li>');
            let anchor = $('<a href="#!">').text(tag);

            // sets display value for filtered elements to false and re-renders page
            anchor.on('click', (event) => {
                var choice = event.target.textContent;
                console.log(this.data.length);
                console.log(choice);
                for (let deal of this.data) {
                    var tagsArr = [];

                    for (let tag of deal.tags) {
                        tagsArr.push(tag.name);
                    }

                    if (tagsArr.indexOf(choice) === -1) {
                        deal.display = false;
                    } else {
                        deal.display = true;
                    }
                }

                localStorage.setItem('groupOnData', JSON.stringify(this.data));
                window.location.href = 'deals.html';
            });

            li.append(anchor);
            dropdown.append(li);
        }
    }

    // find distance between two coordinates
    _earthDistance(coord1, coord2) {
        var RADIUS_OF_EARTH = 3961; // miles
        var lat1 = coord1.lat * Math.PI / 180;
        var lat2 = coord2.lat * Math.PI / 180;
        var lon1 = coord1.lng * Math.PI / 180;
        var lon2 = coord2.lng * Math.PI / 180;

        var dlon = lon2 - lon1;
        var dlat = lat2 - lat1;

        var a = Math.pow(Math.sin(dlat / 2), 2) + Math.cos(lat1) *
            Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return RADIUS_OF_EARTH * c;
    }
}

function initMap(coordDeal, address, modalElement) {
    var directionsRequest = {
        origin: new google.maps.LatLng(coordDeal.lat, coordDeal.lng),
        destination: new google.maps.LatLng(address.geometry.location.lat, address.geometry.location.lng),
        travelMode: 'DRIVING'
    };
    var directionsService = new google.maps.DirectionsService;
    var directionsDisplay = new google.maps.DirectionsRenderer;
    var mapCenter = new google.maps.LatLng((coordDeal.lat + address.geometry.location.lat) / 2, (coordDeal.lng + address.geometry.location.lng) / 2);

    var map = new google.maps.Map(modalElement, {
        zoom: 12,
        center: mapCenter
    });

    directionsDisplay.setMap(map);
    calcAndDisplayRoute(directionsService, directionsDisplay, directionsRequest);
}

function calcAndDisplayRoute(directionsService, directionsDisplay, directionsRequest) {
    directionsService.route(directionsRequest, function(result, status) {
        if (status === 'OK') {
            directionsDisplay.setDirections(result);
        }
    });
}