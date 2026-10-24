// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ContentMarketplace {
    struct Listing {
        address payable author;
        uint256 price;        // in wei
        bytes32 contentHash;  // keccak256 of the content
        bool active;
    }

    address payable public owner;
    uint256 public feeBps = 200;       // 2% platform fee (max 10%)
    uint256 public listingCount;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => mapping(address => bool)) public purchased;

    bool private locked;

    event ListingCreated(uint256 indexed id, address indexed author, uint256 price, bytes32 contentHash);
    event ListingUpdated(uint256 indexed id, uint256 price, bool active);
    event Purchased(uint256 indexed id, address indexed buyer, address indexed author, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrancy");
        locked = true;
        _;
        locked = false;
    }

    constructor() {
        owner = payable(msg.sender);
    }

    function createListing(uint256 price, bytes32 contentHash) external returns (uint256 id) {
        require(price > 0, "Price must be > 0");
        id = ++listingCount;
        listings[id] = Listing(payable(msg.sender), price, contentHash, true);
        emit ListingCreated(id, msg.sender, price, contentHash);
    }

    function updateListing(uint256 id, uint256 newPrice, bool active) external {
        Listing storage l = listings[id];
        require(l.author == msg.sender, "Not the author");
        require(newPrice > 0, "Price must be > 0");
        l.price = newPrice;
        l.active = active;
        emit ListingUpdated(id, newPrice, active);
    }

    function buy(uint256 id) external payable nonReentrant {
        Listing memory l = listings[id];
        require(l.author != address(0), "Listing not found");
        require(l.active, "Listing not active");
        require(msg.sender != l.author, "Author already has access");
        require(!purchased[id][msg.sender], "Already purchased");
        require(msg.value == l.price, "Send the exact price");

        purchased[id][msg.sender] = true;

        uint256 fee = (msg.value * feeBps) / 10000;
        uint256 authorAmount = msg.value - fee;

        (bool ok1, ) = l.author.call{value: authorAmount}("");
        require(ok1, "Payment to author failed");

        if (fee > 0) {
            (bool ok2, ) = owner.call{value: fee}("");
            require(ok2, "Fee payment failed");
        }

        emit Purchased(id, msg.sender, l.author, msg.value, block.timestamp);
    }

    function hasAccess(uint256 id, address user) external view returns (bool) {
        Listing storage l = listings[id];
        return l.author != address(0) && (l.author == user || purchased[id][user]);
    }

    function setFee(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        feeBps = bps;
    }
}
