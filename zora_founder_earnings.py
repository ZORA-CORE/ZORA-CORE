
# zora_founder_earnings.py

def calculate_founder_earnings(total_sales_dkk, is_supporter=False):
    """
    Calculate the founder's personal earnings based on a percentage of total sales.

    :param total_sales_dkk: float - The total sales amount in DKK
    :param is_supporter: bool - True if the user is a supporter (higher founder cut)
    :return: float - The founder's earnings in DKK
    """
    cut_percentage = 0.20 if is_supporter else 0.15
    return round(total_sales_dkk * cut_percentage, 2)
