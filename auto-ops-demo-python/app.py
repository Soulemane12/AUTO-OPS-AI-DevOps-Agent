def checkout(order):
    return order["customer"]["id"]  # will error if keys missing

if __name__ == "__main__":
    data = {}  # guaranteed KeyError
    print(checkout(data))