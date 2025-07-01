
# ZORA Founder Earnings Logic

founder_cut_percentage = 0.15
supporter_bonus_cut = 0.2

def calculate_founder_earnings(total_sale_amount, is_supporter=False):
    """
    Calculates the founder's earnings from a sale.

    :param total_sale_amount: Total sale amount in currency (float)
    :param is_supporter: Boolean indicating if user opted to support the founder
    :return: Founder earnings in currency (float)
    """
    cut = supporter_bonus_cut if is_supporter else founder_cut_percentage
    return round(total_sale_amount * cut, 2)

# Example usage
if __name__ == "__main__":
    example_sale = 100.0  # Replace with dynamic sale input
    print("Founder earning:", calculate_founder_earnings(example_sale, is_supporter=True))
